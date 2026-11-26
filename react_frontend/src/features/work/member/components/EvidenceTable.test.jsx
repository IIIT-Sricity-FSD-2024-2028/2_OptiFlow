import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EvidenceTable from './EvidenceTable';

const sampleEvidence = [
  {
    id: 'ev-1',
    title: 'demo evidence',
    taskId: 'task-1',
    evidenceType: 'Image',
    status: 'Rejected',
    notes: 'pls provide valid image',
    submittedAt: '2026-11-26T18:11:52.806Z',
    reviewedAt: '2026-11-26T18:12:31.031Z',
    reviewedBy: { fullName: 'Samuel Jackson', email: 'compliance@acme.com' },
    fileUrl: '/uploads/demo.png',
  },
];

describe('EvidenceTable', () => {
  it('renders submittedAt date instead of "Recent" and opens rejection message modal from Actions icon', () => {
    render(
      <EvidenceTable
        evidence={sampleEvidence}
        tasks={[{ id: 'task-1', title: 'Implement OAuth Flow' }]}
        searchQuery=""
        typeFilter=""
        statusFilter="all"
      />,
    );

    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    expect(screen.getByText(/Rejection feedback: pls provide valid image/i)).toBeInTheDocument();

    const msgButton = screen.getByLabelText('View rejection message');
    fireEvent.click(msgButton);

    expect(screen.getByText('Rejection Feedback')).toBeInTheDocument();
    expect(screen.getByText('pls provide valid image')).toBeInTheDocument();
    expect(screen.getByText(/Samuel Jackson/i)).toBeInTheDocument();
  });
});
