import { useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { EmptyState, SkeletonTable } from '../feedback/EmptyState';

/**
 * DataTable
 * ─────────
 * Fully featured data table built on TanStack Table v8.
 * Supports column sorting, debounced global search, multi-row selection,
 * bulk action slot, and pagination controls.
 *
 * @param {Array}   data                  - Row data array
 * @param {Array}   columns               - TanStack column definitions
 * @param {boolean} [isLoading]           - Shows shimmer skeleton
 * @param {boolean} [enableRowSelection]  - Enables checkbox column
 * @param {ReactNode} [bulkActions]       - Rendered when rows are selected
 * @param {number}  [pageSize]            - Default rows per page (default: 10)
 * @param {string}  [emptyTitle]          - Empty state heading
 * @param {string}  [emptyDescription]   - Empty state subtext
 */
export default function DataTable({
  data = [],
  columns = [],
  isLoading = false,
  enableRowSelection = false,
  bulkActions,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

  // Prepend checkbox column when selection enabled
  const selectionCol = {
    id: '__select__',
    size: 40,
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        style={{ cursor: 'pointer' }}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        style={{ cursor: 'pointer' }}
        aria-label="Select row"
      />
    ),
  };

  const tableColumns = enableRowSelection ? [selectionCol, ...columns] : columns;

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, globalFilter, rowSelection },
    enableRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div style={{ width: '100%' }}>
      {/* Bulk actions bar */}
      {enableRowSelection && selectedCount > 0 && bulkActions && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px',
          background: 'var(--primary-light)',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius)',
          marginBottom: 12,
          animation: 'slideDown 0.2s ease',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--primary-color)' }}>
            {selectedCount} row{selectedCount !== 1 ? 's' : ''} selected
          </span>
          {bulkActions}
        </div>
      )}

      {/* Table */}
      <div style={{ width: '100%', overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: 'white' }}>
        {isLoading ? (
          <SkeletonTable rows={5} cols={columns.length + (enableRowSelection ? 1 : 0)} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        padding: '11px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                        textTransform: 'uppercase', color: 'var(--text-muted)',
                        background: 'var(--surface-2)',
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        userSelect: 'none', whiteSpace: 'nowrap',
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span style={{ color: '#cbd5e1' }}>
                            {header.column.getIsSorted() === 'asc' ? <ChevronUp size={12} /> :
                             header.column.getIsSorted() === 'desc' ? <ChevronDown size={12} /> :
                             <ChevronsUpDown size={12} />}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length}>
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      variant="search"
                    />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: i < table.getRowModel().rows.length - 1 ? '1px solid var(--border-color)' : 'none',
                      background: row.getIsSelected() ? 'var(--primary-light)' : 'white',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!row.getIsSelected()) e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { if (!row.getIsSelected()) e.currentTarget.style.background = 'white'; }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ padding: '14px 16px', fontSize: 14, verticalAlign: 'middle' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && data.length > pageSize && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 14, flexWrap: 'wrap', gap: 10,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {table.getFilteredRowModel().rows.length} total
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { Icon: ChevronsLeft,  fn: () => table.setPageIndex(0),      disabled: !table.getCanPreviousPage(), label: 'First' },
              { Icon: ChevronLeft,   fn: () => table.previousPage(),        disabled: !table.getCanPreviousPage(), label: 'Previous' },
              { Icon: ChevronRight,  fn: () => table.nextPage(),            disabled: !table.getCanNextPage(),     label: 'Next' },
              { Icon: ChevronsRight, fn: () => table.setPageIndex(table.getPageCount() - 1), disabled: !table.getCanNextPage(), label: 'Last' },
            ].map(({ Icon, fn, disabled, label }) => (
              <button
                key={label}
                onClick={fn}
                disabled={disabled}
                aria-label={label}
                style={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                  background: 'white', cursor: disabled ? 'not-allowed' : 'pointer',
                  color: disabled ? '#cbd5e1' : 'var(--text-muted)',
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
