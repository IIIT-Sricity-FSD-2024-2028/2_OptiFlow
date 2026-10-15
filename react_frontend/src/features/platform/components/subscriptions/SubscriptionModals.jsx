import { SubscriptionPlanModal } from './SubscriptionPlanModal';
import { SubscriptionStatusModal } from './SubscriptionStatusModal';
import { SubscriptionPeriodModal } from './SubscriptionPeriodModal';
import { SubscriptionCancelModal } from './SubscriptionCancelModal';
import { SubscriptionAssignModal } from './SubscriptionAssignModal';

export function SubscriptionModals({
  activeModal,
  targetSub,
  onClose,
  onUpdate,
  onCreate,
}) {
  return (
    <>
      <SubscriptionPlanModal
        isOpen={activeModal === 'plan'}
        subscription={targetSub}
        onClose={onClose}
        onConfirm={onUpdate}
      />
      <SubscriptionStatusModal
        isOpen={activeModal === 'status'}
        subscription={targetSub}
        onClose={onClose}
        onConfirm={onUpdate}
      />
      <SubscriptionPeriodModal
        isOpen={activeModal === 'period'}
        subscription={targetSub}
        onClose={onClose}
        onConfirm={onUpdate}
      />
      <SubscriptionCancelModal
        isOpen={activeModal === 'cancel'}
        subscription={targetSub}
        onClose={onClose}
        onConfirm={onUpdate}
      />
      <SubscriptionAssignModal
        isOpen={activeModal === 'assign'}
        onClose={onClose}
        onConfirm={onCreate}
      />
    </>
  );
}
