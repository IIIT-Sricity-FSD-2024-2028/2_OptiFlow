/**
 * Table component — generic data grid renderer
 */
window.Table = {

  /**
   * Render a table into a container element
   * @param {HTMLElement} container
   * @param {Object} options — { columns, rows, emptyText, actions }
   */
  render(container, { columns, rows, emptyText = 'No data found.', rowKey = 'id' }) {
    if (!container) return;

    if (!rows || rows.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div class="empty-state-text">${emptyText}</div>
          <div class="empty-state-sub">No records to display.</div>
        </div>`;
      return;
    }

    const thead = `<thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map(row => {
      const cells = columns.map(c => {
        const val = c.render ? c.render(row) : (row[c.key] || '—');
        return `<td>${val}</td>`;
      }).join('');
      return `<tr data-id="${row[rowKey]}">${cells}</tr>`;
    }).join('')}</tbody>`;

    container.innerHTML = `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
  }
};
