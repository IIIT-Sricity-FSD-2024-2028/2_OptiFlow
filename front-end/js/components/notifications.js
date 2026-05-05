/**
 * Notifications Component
 * Handles the bell icon, unread count badge, and dropdown list.
 */
window.Notifications = {
  state: null,
  isOpen: false,

  async init() {
    const session = window.Auth.getSession();
    if (!session) return;

    // 1. Get notifications for current user
    const fullState = await window.Helpers.getState();
    const myNotifications = (fullState.notifications || []).filter(
      n => String(n.userId) === String(session.id) || String(n.userId) === String(session.userId)
    );

    this.renderBadge(myNotifications);
    this.bindEvents(myNotifications);
  },

  renderBadge(notifications) {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const bellBtn = document.getElementById('btn-notifications');
    if (!bellBtn) return;

    // Remove existing badge
    const oldBadge = bellBtn.querySelector('.notification-badge');
    if (oldBadge) oldBadge.remove();

    if (unreadCount > 0) {
      const badge = document.createElement('div');
      badge.className = 'notification-badge';
      badge.style = `
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        min-width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        border: 2px solid #fff;
      `;
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      bellBtn.appendChild(badge);
    }
  },

  bindEvents(notifications) {
    const bellBtn = document.getElementById('btn-notifications');
    if (!bellBtn) return;

    bellBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleDropdown(notifications);
    };

    // Close on outside click
    document.addEventListener('click', () => {
      this.closeDropdown();
    });
  },

  toggleDropdown(notifications) {
    if (this.isOpen) {
      this.closeDropdown();
      return;
    }

    const bellBtn = document.getElementById('btn-notifications');
    const rect = bellBtn.getBoundingClientRect();

    const dropdown = document.createElement('div');
    dropdown.id = 'notifications-dropdown';
    dropdown.style = `
      position: fixed;
      top: ${rect.bottom + 8}px;
      right: ${window.innerWidth - rect.right}px;
      width: 320px;
      max-height: 400px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideDown 0.2s ease-out;
    `;

    const header = `
      <div style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
        <span style="font-weight: 700; font-size: 14px; color: #0f172a;">Notifications</span>
        <button onclick="window.Notifications.markAllRead()" style="background: none; border: none; color: #2563eb; font-size: 11px; font-weight: 600; cursor: pointer;">Mark all as read</button>
      </div>
    `;

    const listHtml = notifications.length === 0 
      ? '<div style="padding: 32px 16px; text-align: center; color: #64748b; font-size: 13px;">No notifications yet</div>'
      : `<div style="overflow-y: auto; flex: 1;">
          ${notifications.map(n => `
            <div onclick="window.Notifications.handleItemClick('${n.id}', '${n.link}')" style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s; background: ${n.isRead ? '#fff' : '#eff6ff'};" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${n.isRead ? '#fff' : '#eff6ff'}'">
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span style="font-weight: 700; font-size: 13px; color: #1e293b;">${n.title}</span>
                <span style="font-size: 10px; color: #94a3b8;">${new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">${n.message}</p>
            </div>
          `).join('')}
        </div>`;

    dropdown.innerHTML = header + listHtml;
    dropdown.onclick = (e) => e.stopPropagation();
    
    document.body.appendChild(dropdown);
    this.isOpen = true;
  },

  closeDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) dropdown.remove();
    this.isOpen = false;
  },

  async handleItemClick(id, link) {
    try {
      await window.Helpers.api.request(`/notifications/${id}/read`, 'PATCH');
      if (link) window.location.href = link;
      else window.location.reload();
    } catch (e) {
      console.error('Failed to mark read', e);
      if (link) window.location.href = link;
    }
  },

  async markAllRead() {
    const session = window.Auth.getSession();
    if (!session) return;
    try {
      await window.Helpers.api.request('/notifications/read-all', 'POST', { userId: session.id || session.userId });
      window.location.reload();
    } catch (e) {
      console.error('Failed to mark all read', e);
    }
  }
};

// CSS Animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);
