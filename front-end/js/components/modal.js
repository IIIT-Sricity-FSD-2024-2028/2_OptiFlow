/**
 * Modal component — generic dialog system
 */
window.Modal = {

  _activeId: null,

  icons: {
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    warn:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  },

  /**
   * Open a pre-existing modal (by id) — just toggle visibility
   */
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); this._activeId = id; }
    document.body.style.overflow = 'hidden';
  },

  close(id) {
    const el = document.getElementById(id || this._activeId);
    if (el) el.classList.add('hidden');
    document.body.style.overflow = '';
    this._activeId = null;
  },

  /**
   * Dynamically create & show a modal
   */
  create({ id, title, body, footerHTML, size = '' }) {
    // Remove existing if any
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id        = id;
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal${size ? ' modal-' + size : ''}">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close" onclick="window.Modal.close('${id}')">${this.icons.close}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>`;

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close(id);
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    this._activeId = id;
  },

  /**
   * Confirm dialog
   */
  confirm({ title, message, confirmLabel = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
    const id = 'modal-confirm-' + Date.now();
    this.create({
      id,
      title,
      body: `
        <div class="text-center">
          <div class="confirm-icon danger" style="margin: 0 auto 14px;">
            ${this.icons.warn}
          </div>
          <div class="confirm-title">${title}</div>
          <div class="confirm-message">${message}</div>
        </div>`,
      footerHTML: `
        <button class="btn btn-secondary btn-sm" onclick="window.Modal.close('${id}')">Cancel</button>
        <button class="btn ${confirmClass} btn-sm" id="confirm-btn-${id}">${confirmLabel}</button>`
    });

    document.getElementById(`confirm-btn-${id}`).addEventListener('click', () => {
      window.Modal.close(id);
      if (onConfirm) onConfirm();
    });
  }
};
