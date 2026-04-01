/**
 * Toast notification component
 */
window.Toast = {

  _container: null,

  _icons: {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    close:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  },

  init() {
    if (!document.getElementById('toast-container')) {
      const c = document.createElement('div');
      c.id = 'toast-container';
      document.body.appendChild(c);
    }
    this._container = document.getElementById('toast-container');
  },

  show(type = 'info', title, message = '', duration = 3500) {
    if (!this._container) this.init();

    const id   = 'toast-' + Date.now();
    const el   = document.createElement('div');
    el.id      = id;
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <div class="toast-icon">${this._icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <div class="toast-close" onclick="window.Toast.dismiss('${id}')">${this._icons.close}</div>`;

    this._container.appendChild(el);

    setTimeout(() => this.dismiss(id), duration);
  },

  dismiss(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(120%)';
    setTimeout(() => el.remove(), 320);
  },

  success(title, msg)   { this.show('success', title, msg); },
  error(title, msg)     { this.show('error',   title, msg); },
  warning(title, msg)   { this.show('warning', title, msg); },
  info(title, msg)      { this.show('info',    title, msg); }
};
