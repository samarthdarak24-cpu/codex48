import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export interface Column<T> {
  key: string
  header: React.ReactNode
  cell: (row: T, index: number) => React.ReactNode
  width?: string
  align?: 'left' | 'right' | 'center'
  className?: string
  headerClassName?: string
}

export function DataTable<T>({
  columns,
  rows,
  getKey,
  loading,
  empty,
  onRowClick,
  className,
  dense,
  minWidth = '0px',
  selectedIds,
  onToggleRow,
  onToggleAll,
  footer,
}: {
  columns: Column<T>[]
  rows: T[]
  getKey: (row: T) => string
  loading?: boolean
  empty?: React.ReactNode
  onRowClick?: (row: T) => void
  className?: string
  dense?: boolean
  minWidth?: string
  selectedIds?: string[]
  onToggleRow?: (id: string) => void
  onToggleAll?: (next: boolean) => void
  footer?: React.ReactNode
}) {
  const selectable = Boolean(onToggleRow)
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedIds?.includes(getKey(r)))

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full table-fixed border-collapse" style={{ minWidth }}>
        <thead>
          <tr className="border-y border-line bg-[#F8FAFE]">
            {selectable && (
              <th className="w-8 px-2.5 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={Boolean(allSelected)}
                  onChange={(e) => onToggleAll?.(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer rounded-[4px] border-line-strong"
                />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  'whitespace-nowrap px-2.5 text-left text-2xs font-semibold uppercase tracking-[0.055em] text-muted',
                  dense ? 'py-2' : 'py-2.5',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                  c.headerClassName,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton cols={columns.length + (selectable ? 1 : 0)} rows={6} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-3 py-0">
                {empty ?? <EmptyState title="Nothing here yet" description="Records will appear here once they exist." />}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const id = getKey(row)
              const selected = selectedIds?.includes(id)
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-line last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer',
                    selected ? 'bg-brand-50/60' : 'hover:bg-[#F9FBFF]',
                  )}
                >
                  {selectable && (
                    <td className="px-2.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select row ${i + 1}`}
                        checked={Boolean(selected)}
                        onChange={() => onToggleRow?.(id)}
                        className="h-3.5 w-3.5 cursor-pointer rounded-[4px] border-line-strong"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'px-2.5 align-middle text-base text-ink',
                        dense ? 'py-2' : 'py-2.5',
                        c.align === 'right' && 'text-right',
                        c.align === 'center' && 'text-center',
                        c.className,
                      )}
                    >
                      {c.cell(row, i)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  )
}

function TableSkeleton({ cols, rows }: { cols: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-line last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-3">
              <div
                className="shimmer h-3 rounded bg-[#EFF4FB]"
                style={{ width: c === 0 ? '70%' : c === cols - 1 ? '40%' : '55%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  compact,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 text-center', compact ? 'py-8' : 'py-12', className)}>
      <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-400">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-[17px] text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  className,
  label = 'items',
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
  className?: string
  label?: string
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const window = pageNumbers(page, pages)

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-3', className)}>
      <p className="text-xs text-muted">
        Showing <span className="font-medium text-ink-600">{from}</span>–
        <span className="font-medium text-ink-600">{to}</span> of{' '}
        <span className="font-medium text-ink-600">{total}</span> {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-md border border-line bg-white text-ink-600 transition-colors hover:bg-[#F5F9FF] disabled:opacity-40',
            pages <= 1 && 'hidden',
          )}
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        {pages > 1 &&
          window.map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-medium transition-colors',
                  p === page
                    ? 'bg-brand-500 text-white shadow-[0_1px_2px_rgba(15,33,56,.15)]'
                    : 'border border-line bg-white text-ink-600 hover:bg-[#F5F9FF]',
                )}
              >
                {p}
              </button>
            ),
          )}
        <button
          onClick={() => onPage(Math.min(pages, page + 1))}
          disabled={page >= pages}
          aria-label="Next page"
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-md border border-line bg-white text-ink-600 transition-colors hover:bg-[#F5F9FF] disabled:opacity-40',
            pages <= 1 && 'hidden',
          )}
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}

/* ------------------------------------------------------------------ */
/* Row actions                                                         */
/* ------------------------------------------------------------------ */

export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>
}

export function ViewButton({ onClick, label = 'View' }: { onClick?: () => void; label?: string }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} className="h-7 px-2.5 text-xs">
      {label}
    </Button>
  )
}
