/**
 * DataTable — one TanStack Table implementation for every register in the app.
 *
 * Before this file each register (All Submissions, Approved Content, Asset
 * Library, Audit History, Exceptions) re-implemented sorting, paging and
 * selection by hand, and sorting was a `<select>` rather than a column header.
 * TanStack gives us real column sorting, column visibility, row selection and
 * pagination from a single declarative column list, so the registers behave
 * identically and we stop shipping five subtly different tables.
 *
 * Styling is entirely Precedent tokens — cream header, `line` borders,
 * forest-green focus rings — so nothing looks like stock shadcn.
 */
import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, Columns3, Inbox,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  /** Stable id — also the column-visibility key. */
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Value used for sorting and the global text filter. */
  accessor?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
  className?: string;
  headerClassName?: string;
  /** Hide from the visibility menu (e.g. the actions column). */
  canHide?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T) => void;
  /** Controlled text filter applied across every accessor. */
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  initialSort?: SortingState;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  /** Rendered under the table, e.g. a footnote about what the API returns. */
  footnote?: React.ReactNode;
  minWidth?: string;
  dense?: boolean;
  className?: string;
}

const ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

const JUSTIFY = {
  left: 'justify-start',
  right: 'justify-end',
  center: 'justify-center',
} as const;

export function DataTable<T>({
  data,
  columns,
  getRowId,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  onRowClick,
  globalFilter,
  onGlobalFilterChange,
  selectable = false,
  selectedIds,
  onSelectionChange,
  initialSort = [],
  emptyTitle = 'Nothing to show',
  emptyDescription = 'No rows match the current filters.',
  emptyIcon,
  footnote,
  minWidth = '820px',
  dense = false,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  /* ---- Column definitions ------------------------------------------ */

  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    const defs: ColumnDef<T>[] = columns.map((col) => ({
      id: col.id,
      accessorFn: (row: T) => (col.accessor ? col.accessor(row) : undefined),
      header: col.header,
      enableSorting: col.sortable !== false,
      enableHiding: col.canHide !== false,
      cell: ({ row }) => (
        <div className={cn('flex items-center', JUSTIFY[col.align ?? 'left'])}>{col.cell(row.original)}</div>
      ),
      meta: { col },
    }));

    if (selectable) {
      defs.unshift({
        id: '__select',
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all rows on this page"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-2 focus:ring-brand-300/50"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select row ${row.id}`}
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-2 focus:ring-brand-300/50"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 34,
      });
    }

    return defs;
  }, [columns, selectable]);

  /* ---- Selection bridging ------------------------------------------ */

  const selectedRowIds = useMemo(() => {
    if (selectedIds) return Object.fromEntries(selectedIds.map((id) => [id, true]));
    return rowSelection;
  }, [selectedIds, rowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection: selectedRowIds,
      ...(globalFilter !== undefined ? { globalFilter } : {}),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: (updater) => {
      const next = typeof updater === 'function' ? updater(globalFilter ?? '') : updater;
      onGlobalFilterChange?.(next as string);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(selectedRowIds) : updater;
      const ids = Object.entries(next)
        .filter(([, on]) => on)
        .map(([id]) => id);
      if (onSelectionChange) onSelectionChange(ids);
      else setRowSelection(next as Record<string, boolean>);
    },
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: selectable,
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const visibleCount = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination;
  const firstShown = visibleCount === 0 ? 0 : pageIndex * currentPageSize + 1;
  const lastShown = Math.min((pageIndex + 1) * currentPageSize, visibleCount);
  const pageCount = table.getPageCount();
  const selectedCount = Object.values(selectedRowIds).filter(Boolean).length;

  /* ---- Pagination page list ---------------------------------------- */

  const pageButtons = useMemo(() => {
    const current = pageIndex + 1;
    return Array.from({ length: pageCount }, (_, i) => i + 1).filter(
      (p) => Math.abs(p - current) < 3 || p === 1 || p === pageCount,
    );
  }, [pageCount, pageIndex]);

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-line bg-white shadow-card', className)}>
      {/* Column visibility */}
      <div className="flex items-center justify-end gap-2 border-b border-line bg-cream-50/60 px-3 py-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-2xs font-semibold text-ink-700 transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/50"
            >
              <Columns3 className="h-3 w-3" />
              Columns
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[180px] rounded-xl border border-line bg-white p-1.5 shadow-pop"
            >
              <DropdownMenu.Label className="px-2 py-1 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-light">
                Visible columns
              </DropdownMenu.Label>
              {table
                .getAllLeafColumns()
                .filter((col) => col.getCanHide())
                .map((col) => {
                  const meta = col.columnDef.meta as { col?: DataTableColumn<T> } | undefined;
                  return (
                    <DropdownMenu.CheckboxItem
                      key={col.id}
                      checked={col.getIsVisible()}
                      onCheckedChange={(value) => col.toggleVisibility(Boolean(value))}
                      onSelect={(e) => e.preventDefault()}
                      className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink-700 outline-none data-[highlighted]:bg-cream-50"
                    >
                      <span
                        className={cn(
                          'flex h-3.5 w-3.5 items-center justify-center rounded border',
                          col.getIsVisible()
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-line-strong bg-white',
                        )}
                        aria-hidden="true"
                      >
                        {col.getIsVisible() && (
                          <svg viewBox="0 0 10 10" className="h-2 w-2" fill="none">
                            <path d="M1.5 5.2 3.8 7.5 8.5 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {meta?.col?.header ?? col.id}
                    </DropdownMenu.CheckboxItem>
                  );
                })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-line bg-cream-50">
              {table.getHeaderGroups()[0]?.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  | { col?: DataTableColumn<T> }
                  | undefined;
                const col = meta?.col;
                const sortable = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    style={col?.width ? { width: col.width } : undefined}
                    className={cn(
                      'px-3 text-2xs font-semibold uppercase tracking-[0.06em] text-muted',
                      dense ? 'py-2' : 'py-3',
                      ALIGN[col?.align ?? 'left'],
                      col?.headerClassName,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'inline-flex items-center gap-1 rounded transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/50',
                          sorted && 'text-ink',
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ChevronUp className="h-3 w-3 text-brand-600" />
                        ) : sorted === 'desc' ? (
                          <ChevronDown className="h-3 w-3 text-brand-600" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 text-muted-light/70" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.length === 0 && (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-14 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    {emptyIcon ?? <Inbox className="h-6 w-6 text-muted-light" />}
                    <p className="mt-2 text-sm font-medium text-ink-600">{emptyTitle}</p>
                    <p className="mt-0.5 text-2xs leading-relaxed text-muted">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const interactive = Boolean(onRowClick);
              return (
                <tr
                  key={row.id}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={interactive ? () => onRowClick?.(row.original) : undefined}
                  onKeyDown={
                    interactive
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick?.(row.original);
                          }
                        }
                      : undefined
                  }
                  aria-selected={selectable ? row.getIsSelected() : undefined}
                  className={cn(
                    'transition-colors',
                    row.getIsSelected() && 'bg-brand-50/40',
                    interactive &&
                      'cursor-pointer hover:bg-cream-50 focus-visible:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300',
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | { col?: DataTableColumn<T> }
                      | undefined;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-3 align-middle',
                          dense ? 'py-1.5' : 'py-2.5',
                          meta?.col?.className,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="text-2xs text-muted">
          Showing {firstShown}–{lastShown} of {visibleCount}
          {selectedCount > 0 && ` · ${selectedCount} selected`}
        </p>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-2xs text-muted">
            <span className="sr-only">Rows per page</span>
            <select
              value={currentPageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="rounded-lg border border-line bg-white px-1.5 py-1 text-2xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-300/40"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
              className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-cream-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {pageButtons.map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && p - arr[idx - 1] > 1 && (
                  <span className="px-1 text-2xs text-muted-light">…</span>
                )}
                <button
                  type="button"
                  onClick={() => table.setPageIndex(p - 1)}
                  aria-current={p === pageIndex + 1 ? 'page' : undefined}
                  className={cn(
                    'h-7 min-w-[28px] rounded-lg px-1.5 text-xs font-semibold transition-colors',
                    p === pageIndex + 1
                      ? 'bg-brand-600 text-white'
                      : 'border border-line text-muted hover:bg-cream-50',
                  )}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
              className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-cream-50 disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {footnote && (
        <div className="border-t border-line bg-cream-50/50 px-4 py-2 text-2xs leading-relaxed text-muted-light">
          {footnote}
        </div>
      )}
    </div>
  );
}
