import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, Search, FileSpreadsheet, FileText, Printer, Columns3 } from 'lucide-react'
import { cx } from '@/lib/utils'
import { exportToExcel, exportToPDF, printRows } from '@/lib/exporters'
import { TABLE_COLUMNS_KEY_PREFIX } from '@/lib/constants'

const isActionCol = (c) => c.key === '__action' || c.key === '__actions'

// Hidden-column choices are a per-browser convenience — if storage is
// blocked or empty, every column just shows.
function loadHidden(columnsKey) {
  if (!columnsKey) return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(TABLE_COLUMNS_KEY_PREFIX + columnsKey)) || [])
  } catch {
    return new Set()
  }
}

function saveHidden(columnsKey, hidden) {
  try {
    localStorage.setItem(TABLE_COLUMNS_KEY_PREFIX + columnsKey, JSON.stringify([...hidden]))
  } catch {
    // ignore — the choice just won't survive a reload
  }
}

/**
 * Generic data table: client-side search + sort + pagination + export.
 * columns: [{ key, label, render?(row), sortable? = true, sortKey?, className? }]
 * sortKey: sort by a different row field than the displayed one — e.g. a
 * formatted date column sorting by its raw ISO date.
 *
 * columnsKey: pass one to give the table a "Columns" picker — users can hide
 * columns they don't need, remembered per browser under that key. Search
 * and Excel/PDF/Print still cover every column, hidden or not.
 *
 * Renders as a real <table> from md upward, and as a stacked list of cards
 * on narrower screens — same data, same columns, no separate config needed.
 */
export default function DataTable({
  columns,
  rows,
  searchable = true,
  searchPlaceholder = 'Search…',
  pageSize = 10,
  exportTitle = 'Report',
  onRowClick,
  emptyLabel = 'No records found.',
  toolbarExtra,
  columnsKey,
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(1)
  const [hidden, setHiddenState] = useState(() => loadHidden(columnsKey))
  const [showColumnPicker, setShowColumnPicker] = useState(false)

  const setHidden = (next) => {
    setHiddenState(next)
    saveHidden(columnsKey, next)
  }
  const toggleColumn = (key) => {
    const next = new Set(hidden)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setHidden(next)
  }

  const pickableColumns = columns.filter((c) => !isActionCol(c))
  const visibleColumns = columnsKey ? columns.filter((c) => !hidden.has(c.key)) : columns
  const hiddenCount = pickableColumns.filter((c) => hidden.has(c.key)).length

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((row) => columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(q)))
  }, [rows, query, columns])

  const sorted = useMemo(() => {
    if (!sort.key) return filtered
    const field = columns.find((c) => c.key === sort.key)?.sortKey || sort.key
    const arr = [...filtered]
    arr.sort((a, b) => {
      const av = a[field]
      const bv = b[field]
      if (av == null || av === '') return 1
      if (bv == null || bv === '') return -1
      if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av
      return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return arr
  }, [filtered, sort, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  const exportColumns = pickableColumns.map((c) => ({ key: c.key, label: c.label }))

  // For the mobile card layout: an "Action" column (used by stage queues)
  // becomes a full-width button at the bottom of the card instead of a
  // label/value line; the first remaining column becomes the card title.
  const actionCol = visibleColumns.find(isActionCol)
  const infoCols = visibleColumns.filter((c) => c !== actionCol)
  const [titleCol, ...restCols] = infoCols

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-hos-ink-200 p-3">
        {searchable && (
          <div className="relative min-w-[160px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hos-ink-400" />
            <input
              className="input pl-9"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>
        )}
        {toolbarExtra}
        <div className="ml-auto flex gap-1.5">
          {columnsKey && (
            <button
              className={cx('btn-outline btn-sm', showColumnPicker && 'bg-hos-gold-50')}
              onClick={() => setShowColumnPicker((v) => !v)}
              title="Show / hide columns"
            >
              <Columns3 size={14} />
              <span className="hidden sm:inline">Columns{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}</span>
            </button>
          )}
          <button className="btn-outline btn-sm" onClick={() => exportToExcel(sorted, exportColumns, `${exportTitle}.xlsx`)} title="Export Excel">
            <FileSpreadsheet size={14} /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button className="btn-outline btn-sm" onClick={() => exportToPDF(sorted, exportColumns, { filename: `${exportTitle}.pdf`, title: exportTitle })} title="Export PDF">
            <FileText size={14} /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button className="btn-outline btn-sm" onClick={() => printRows(sorted, exportColumns, exportTitle)} title="Print">
            <Printer size={14} /> <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {columnsKey && showColumnPicker && (
        <div className="border-b border-hos-ink-200 bg-hos-ink-50/60 px-3 py-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Show columns</span>
            <button className="text-xs font-medium text-hos-gold-700 hover:underline" onClick={() => setHidden(new Set())}>
              Show all
            </button>
            <button className="text-xs font-medium text-hos-gold-700 hover:underline" onClick={() => setHidden(new Set(pickableColumns.map((c) => c.key)))}>
              Hide all
            </button>
            <button className="btn-outline btn-sm ml-auto" onClick={() => setShowColumnPicker(false)}>
              Done
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
            {pickableColumns.map((c) => (
              <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm text-hos-ink-700">
                <input type="checkbox" className="accent-hos-gold-500" checked={!hidden.has(c.key)} onChange={() => toggleColumn(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Desktop / tablet: real table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-hos-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-hos-ink-500">
            <tr>
              {visibleColumns.map((c) => (
                <th
                  key={c.key}
                  className={cx('px-4 py-2.5 select-none whitespace-nowrap', c.sortable !== false && 'cursor-pointer', c.className)}
                  onClick={() => c.sortable !== false && toggleSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sort.key === c.key && (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hos-ink-100">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-10 text-center text-hos-ink-400">
                  {emptyLabel}
                </td>
              </tr>
            )}
            {pageRows.map((row, i) => (
              <tr
                key={row.id || i}
                className={cx('hover:bg-hos-gold-50/60', onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row)}
              >
                {visibleColumns.map((c) => (
                  <td key={c.key} className={cx('px-4 py-2.5 whitespace-nowrap', c.className)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per row */}
      <div className="divide-y divide-hos-ink-100 md:hidden">
        {pageRows.length === 0 && <div className="px-4 py-10 text-center text-sm text-hos-ink-400">{emptyLabel}</div>}
        {pageRows.map((row, i) => (
          <div key={row.id || i} className={cx('p-4', onRowClick && 'active:bg-hos-gold-50/60')} onClick={() => onRowClick?.(row)}>
            {titleCol && (
              <div className="text-sm font-semibold text-hos-ink-900">{titleCol.render ? titleCol.render(row) : row[titleCol.key]}</div>
            )}
            <div className={cx('space-y-1.5', titleCol && 'mt-2')}>
              {restCols.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-3 text-xs">
                  <span className="shrink-0 font-medium uppercase tracking-wide text-hos-ink-400">{c.label}</span>
                  <span className="text-right text-hos-ink-700">{c.render ? c.render(row) : row[c.key]}</span>
                </div>
              ))}
            </div>
            {actionCol && (
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                {actionCol.render(row)}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-hos-ink-200 px-4 py-2.5 text-xs text-hos-ink-500">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button className="btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <button className="btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
