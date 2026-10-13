import React, { useState, useEffect } from 'react';
import { QuotaInput } from './QuotaInput';
import styles from './Plans.module.css';



const INITIAL_FORM_STATE = {
  name: '',
  maxUsers: '',
  unlimitedUsers: true,
  maxBranches: '',
  unlimitedBranches: false,
  maxActiveProcessTemplates: '',
  unlimitedTemplates: false,
  maxComplianceRules: '',
  unlimitedRules: false,
  auditLogRetentionDays: 90,
};



export function PlanDrawer({
    isOpen,
    editingPlan,
    onClose,
    onSave
}){
    const [formData,setFormData] = useState(INITIAL_FORM_STATE);
    const [saving,setSaving] = useState(false);
    const [formError, setFormError] = useState(null);

    //sync form data when editingplan
    useEffect(()=>{
        if (editingPlan) {
        setFormData({
            name: editingPlan.name || '',
            maxUsers:
            editingPlan.maxUsers !== null && editingPlan.maxUsers !== undefined
                ? String(editingPlan.maxUsers)
                : '',
            unlimitedUsers: editingPlan.maxUsers === null,
            maxBranches:
            editingPlan.maxBranches !== null && editingPlan.maxBranches !== undefined
                ? String(editingPlan.maxBranches)
                : '',
            unlimitedBranches: editingPlan.maxBranches === null,
            maxActiveProcessTemplates:
            editingPlan.maxActiveProcessTemplates !== null &&
            editingPlan.maxActiveProcessTemplates !== undefined
                ? String(editingPlan.maxActiveProcessTemplates)
                : '',
            unlimitedTemplates: editingPlan.maxActiveProcessTemplates === null,
            maxComplianceRules:
            editingPlan.maxComplianceRules !== null &&
            editingPlan.maxComplianceRules !== undefined
                ? String(editingPlan.maxComplianceRules)
                : '',
            unlimitedRules: editingPlan.maxComplianceRules === null,
            auditLogRetentionDays: editingPlan.auditLogRetentionDays ?? 90,
        });
        } else {
        setFormData(INITIAL_FORM_STATE);
        }
        setFormError(null);
    },[editingPlan,isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e)=>{
        e.preventDefault();
        if (!formData.name.trim()){
            setFormError('Plan name is required');
            return;
        }

        try{
            setSaving(true);
            setFormError(null);
            await onSave(formData,editingPlan?.id || null);
            onClose();
        }
        catch(err){
            console.error('Failed to save plan:', err);
            setFormError(err.message || 'Failed to save plan changes');
        }
        finally{
            setSaving(false);
        }
    };

    return(
          <div className={styles.drawerOverlay} onClick={() => !saving && onClose()}>
            <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
                {/* Drawer Header */}
                <div className={styles.drawerHeader}>
                    <h3 className={styles.drawerTitle}>
                        {editingPlan ? `Edit Tier: ${editingPlan.name}` : 'Create Subscription Plan'}
                    </h3>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={() => !saving && onClose()}
                    >
                        ✕
                    </button>
                </div>

                 {/* Drawer Form Body */}
                <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 65px)' }}
                >
                <div className={styles.drawerBody}>
                    {formError && <div className={styles.errorBanner}>{formError}</div>}
                    {/* Plan Name */}
                    <div className={styles.formGroup}>
                    <label className={styles.label}>Plan Name *</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Pro Enterprise"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    </div>
                    {/* Max Users */}
                    <QuotaInput
                    label="Max Users"
                    value={formData.maxUsers}
                    isUnlimited={formData.unlimitedUsers}
                    placeholder="e.g. 100"
                    onValueChange={(val) => setFormData({ ...formData, maxUsers: val })}
                    onUnlimitedChange={(unlimited) =>
                        setFormData({ ...formData, unlimitedUsers: unlimited })
                    }
                    />
                    {/* Max Branches */}
                    <QuotaInput
                    label="Max Branches"
                    value={formData.maxBranches}
                    isUnlimited={formData.unlimitedBranches}
                    placeholder="e.g. 5"
                    onValueChange={(val) => setFormData({ ...formData, maxBranches: val })}
                    onUnlimitedChange={(unlimited) =>
                        setFormData({ ...formData, unlimitedBranches: unlimited })
                    }
                    />
                    {/* Max Active Process Templates */}
                    <QuotaInput
                    label="Max Active Process Templates"
                    value={formData.maxActiveProcessTemplates}
                    isUnlimited={formData.unlimitedTemplates}
                    placeholder="e.g. 20"
                    onValueChange={(val) =>
                        setFormData({ ...formData, maxActiveProcessTemplates: val })
                    }
                    onUnlimitedChange={(unlimited) =>
                        setFormData({ ...formData, unlimitedTemplates: unlimited })
                    }
                    />
                    {/* Max Compliance Rules */}
                    <QuotaInput
                    label="Max Compliance Rules"
                    value={formData.maxComplianceRules}
                    isUnlimited={formData.unlimitedRules}
                    placeholder="e.g. 50"
                    onValueChange={(val) =>
                        setFormData({ ...formData, maxComplianceRules: val })
                    }
                    onUnlimitedChange={(unlimited) =>
                        setFormData({ ...formData, unlimitedRules: unlimited })
                    }
                    />
                    {/* Audit Log Retention */}
                    <div className={styles.formGroup}>
                    <label className={styles.label}>Audit Log Retention (Days)</label>
                    <input
                        type="number"
                        min="30"
                        className={styles.input}
                        value={formData.auditLogRetentionDays}
                        onChange={(e) =>
                        setFormData({ ...formData, auditLogRetentionDays: e.target.value })
                        }
                        required
                    />
                    <span className={styles.helperText}>
                        Number of days immutable audit rows are retained for tenants.
                    </span>
                    </div>
                </div>
                {/* Drawer Footer */}
                <div className={styles.drawerFooter}>
                    <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={onClose}
                    disabled={saving}
                    >
                    Cancel
                    </button>
                    <button type="submit" className={styles.saveBtn} disabled={saving}>
                    {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                    </button>
          </div>
        </form>



            </div>
        </div>
    )
}