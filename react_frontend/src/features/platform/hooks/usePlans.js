import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchPlans,
    createPlan,
    updatePlan,
    selectPlans,
    selectActivePlans,
    selectPlansStatus,
    selectPlansError,
} from '../../../store/platformPlans';

// The hook keeps the same return keys as before, so Plans.jsx does not change.
// The data now lives in the store: other pages (CompanyProvision) share the same list.
export function usePlans() {
    const dispatch = useDispatch();
    const plans = useSelector(selectPlans);
    const status = useSelector(selectPlansStatus);
    const error = useSelector(selectPlansError);

    useEffect(() => {
        dispatch(fetchPlans());
    }, [dispatch]);

    // Table shows "loading" only before the first data arrives, not during a refresh.
    const loading = status === 'idle' || (status === 'loading' && plans.length === 0);

    const refreshPlans = useCallback(() => dispatch(fetchPlans({ force: true })), [dispatch]);

    //code for creating or updating plan
    const savePlan = async (formData, editingPlanId = null) => {
        const payload = {
            name: formData.name.trim(),
            maxUsers: formData.unlimitedUsers ? null : Number(formData.maxUsers || 0),
            maxBranches: formData.unlimitedBranches ? null : Number(formData.maxBranches || 0),
            maxActiveProcessTemplates: formData.unlimitedTemplates
                ? null
                : Number(formData.maxActiveProcessTemplates || 0),
            maxComplianceRules: formData.unlimitedRules
                ? null
                : Number(formData.maxComplianceRules || 0),
            auditLogRetentionDays: Number(formData.auditLogRetentionDays || 90),
        };

        // unwrap() throws the plain { message, status, code } error, which the drawer shows.
        if (editingPlanId) {
            await dispatch(updatePlan({ id: editingPlanId, body: payload })).unwrap();
        } else {
            await dispatch(createPlan(payload)).unwrap();
        }
    };

    //Code for toggling archive
    const setPlanActiveStatus = async (planId, isActive) => {
        await dispatch(updatePlan({ id: planId, body: { isActive } })).unwrap();
    };

    return {
        plans,
        loading,
        error: error?.message ?? null,
        refreshPlans,
        savePlan,
        setPlanActiveStatus,
    };
}

// Plans for a dropdown or a filter (modals, filter bars). Shares the one list in the store with
// the Plans page. `enabled` = false does not fetch (a modal that is closed).
export function usePlanOptions(enabled = true) {
    const dispatch = useDispatch();
    const plans = useSelector(selectPlans);
    const activePlans = useSelector(selectActivePlans);
    const status = useSelector(selectPlansStatus);
    const error = useSelector(selectPlansError);

    useEffect(() => {
        if (enabled) dispatch(fetchPlans());
    }, [dispatch, enabled]);

    const loading = enabled && (status === 'idle' || (status === 'loading' && plans.length === 0));
    return { plans, activePlans, loading, error: error?.message ?? null };
}
