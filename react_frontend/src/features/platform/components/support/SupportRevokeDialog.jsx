import { useState } from 'react';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';

export function SupportRevokeDialog({
  isOpen,
  grant,
  onClose,
  onConfirm,
}) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !grant) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm(grant.id);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to revoke support grant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={() => !loading && onClose()}
      onConfirm={handleConfirm}
      title={`Revoke Support Access for ${grant.company?.legalName || 'Tenant'}`}
      message={`Are you sure you want to revoke this support access grant for ${grant.adminUser?.fullName || 'the administrator'}? Delegated access will terminate immediately. The record and session action logs will be permanently retained in the platform audit trail.`}
      confirmText="Revoke Grant Immediately"
      cancelText="Keep Active"
      variant="danger"
      loading={loading}
    />
  );
}
