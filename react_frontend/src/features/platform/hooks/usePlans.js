import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../services/api/client';

export function usePlans() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    //code for fetching all plans
    const fetchPlans = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await apiClient('/platform/plans');
            setPlans(Array.isArray(res) ? res : res?.items || []);
        }
        catch (err) {
            console.error(err.message || 'Failed to fetch subscription plans');
            setError(err.message || 'Failed to fetch subscription plans');
        }
        finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);


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

        if (editingPlanId) {
            await apiClient(`/platform/plans/${editingPlanId}`, {
                method: 'PATCH',
                body: payload,
            });
        } else {
            await apiClient('/platform/plans', {
                method: 'POST',
                body: payload,
            });
        }

        await fetchPlans();
    };

    //Code for toggling archive
    const setPlanActiveStatus = async (planId, isActive) => {
        await apiClient(`/platform/plans/${planId}`, {
            method: 'PATCH',
            body: { isActive },
        });
        await fetchPlans();
    };

    return {
        plans,
        loading,
        error,
        refreshPlans: fetchPlans,
        savePlan,
        setPlanActiveStatus
    };
};