/**
 * Modal component — generic dialog & global modal manager system
 */
window.Modal = {
  _initialized: false,
  _activeId: null,

  icons: {
    close: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    warn:  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  },

  open(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('active');
      el.style.display = 'flex';
      this._activeId = id;
    }
    document.body.style.overflow = 'hidden';
  },

  close(id) {
    const targetId = id || this._activeId;
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.classList.remove('active');
        el.classList.add('hidden');
        el.style.display = 'none';
        if (el.id.startsWith('dynamic-')) {
          el.remove();
        }
      }
    }
    const remaining = document.querySelectorAll('.modal-overlay.active, .modal-backdrop.active');
    if (!remaining || remaining.length === 0) {
      document.body.style.overflow = '';
      this._activeId = null;
    }
  },

  closeAll() {
    document.querySelectorAll('.modal-overlay, .modal-backdrop').forEach(modal => {
      modal.classList.remove('active');
      modal.classList.add('hidden');
      modal.style.display = 'none';
      if (modal.id.startsWith('dynamic-')) {
        modal.remove();
      }
    });
    document.body.style.overflow = '';
    this._activeId = null;
  },

  create({ id, title, body, actions, footerHTML, size = '' }) {
    const targetId = id || 'dynamic-modal-' + Date.now();
    const existing = document.getElementById(targetId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id        = targetId;
    overlay.className = 'modal-overlay active';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.display = 'flex';

    let footerContent = footerHTML || '';
    if (!footerContent && actions && Array.isArray(actions)) {
      footerContent = actions.map((act, idx) => `
        <button class="btn ${act.class || 'btn-secondary'}" id="${targetId}-act-${idx}">${act.text}</button>
      `).join('');
    }

    overlay.innerHTML = `
      <div class="modal${size ? ' modal-' + size : ''}">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <span class="modal-close" data-dismiss="modal">&times;</span>
        </div>
        <div class="modal-body">${body}</div>
        ${footerContent ? `<div class="modal-footer">${footerContent}</div>` : ''}
      </div>`;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    this._activeId = targetId;

    if (actions && Array.isArray(actions)) {
      actions.forEach((act, idx) => {
        const btn = document.getElementById(`${targetId}-act-${idx}`);
        if (btn) {
          btn.addEventListener('click', async () => {
            if (act.onClick) {
              const shouldClose = await act.onClick();
              if (shouldClose !== false) window.Modal.close(targetId);
            } else if (act.close) {
              window.Modal.close(targetId);
            }
          });
        }
      });
    }

    return targetId;
  },

  init() {
    if (this._initialized) return;
    this._initialized = true;

    // 1. Ensure all static modals default to display: none on render
    const hideAllInertModals = () => {
      document.querySelectorAll('.modal-overlay, .modal-backdrop').forEach(m => {
        if (!m.classList.contains('active')) {
          m.style.display = 'none';
        }
      });
    };
    hideAllInertModals();

    // 2. Global Event Delegation on document.body
    document.body.addEventListener('click', (e) => {
      // A. "New Rule" button click -> opens new rule modal
      const newRuleBtn = e.target.closest('#btn-new-rule, [data-action="new-rule"]');
      if (newRuleBtn) {
        e.preventDefault();
        if (typeof window.openNewRuleModal === 'function') {
          window.openNewRuleModal();
        } else {
          window.Modal.open('newRuleModal');
        }
        return;
      }

      // B. Open trigger with data-target or data-modal
      const openTrigger = e.target.closest('[data-target], [data-modal]');
      if (openTrigger) {
        const target = openTrigger.getAttribute('data-target') || openTrigger.getAttribute('data-modal');
        if (target) {
          e.preventDefault();
          const cleanId = target.replace('#', '');
          window.Modal.open(cleanId);
          return;
        }
      }

      // C. Close button (&times; or .modal-close or [data-dismiss="modal"])
      const closeBtn = e.target.closest('.modal-close, [data-dismiss="modal"]');
      if (closeBtn) {
        e.preventDefault();
        const parentModal = closeBtn.closest('.modal-overlay, .modal-backdrop');
        if (parentModal) {
          window.Modal.close(parentModal.id);
        } else {
          window.Modal.close();
        }
        return;
      }

      // D. Cancel button inside modal footer
      const cancelBtn = e.target.closest('.modal-footer .btn-secondary, .modal-footer [data-action="cancel"]');
      if (cancelBtn) {
        // If button has an explicit onclick handler that returns false, let it handle
        const parentModal = cancelBtn.closest('.modal-overlay, .modal-backdrop');
        if (parentModal && !cancelBtn.hasAttribute('data-custom-cancel')) {
          window.Modal.close(parentModal.id);
        }
        return;
      }

      // E. Background overlay click -> close active modal
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-backdrop')) {
        window.Modal.close(e.target.id);
      }
    });

    // F. Keydown Escape -> close active modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.Modal.closeAll();
      }
    });
  }
};

// Initialize on DOMReady or immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.Modal.init());
} else {
  window.Modal.init();
}
