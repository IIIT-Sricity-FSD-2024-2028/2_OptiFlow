import styles from './Table.module.css';

export const Table = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  onRowClick,
  rowClassName,
}) => {
  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col, index) => (
              <th key={col.key || col.accessor || index} className={styles.th}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className={styles.tbody}>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className={styles.loadingCell}>
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`${onRowClick ? styles.clickableRow : ''} ${rowClassName?.(row) || ''}`}
              >
                {columns.map((col, colIndex) => {
                  let cellContent;
                  if (typeof col.render === 'function') {
                    cellContent = col.render(row, rowIndex);
                  } else if (typeof col.accessor === 'function') {
                    cellContent = col.accessor(row);
                  } else if (col.accessor) {
                    cellContent = row[col.accessor];
                  }

                  return (
                    <td key={col.key || col.accessor || colIndex} className={styles.td}>
                      {cellContent !== undefined && cellContent !== null ? cellContent : '—'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
