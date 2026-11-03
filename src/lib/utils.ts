import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* ------------------------------------------------------------------ */
/* Dates — all demo timestamps are derived from a single base so that  */
/* absolute and relative labels never disagree.                        */
/* ------------------------------------------------------------------ */

export const NOW = new Date()

export function iso(daysAgo: number, hour = 10, minute = 24): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function isoHoursAgo(hours: number): string {
  const d = new Date(NOW)
  d.setHours(d.getHours() - hours)
  return d.toISOString()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtDate(value: string): string {
  const d = new Date(value)
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`
}

export function fmtTime(value: string): string {
  const d = new Date(value)
  let h = d.getHours()
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`
}

export function fmtDateTime(value: string): string {
  return `${fmtDate(value)} · ${fmtTime(value)}`
}

export function fmtShort(value: string): string {
  const d = new Date(value)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/**
 * Parse a timestamp that may already be display-formatted.
 *
 * `fmtDateTime()` renders `"Nov 02, 2026 · 6:52 AM"`, and the middle dot makes
 * `new Date()` return Invalid Date. Any view that sorted or range-filtered on
 * that string was silently working with NaN — which zeroed sort order and, in
 * Audit History, dropped every row from the "Last 30 days" filter. Strip the
 * separator (and normalise whitespace) before giving up.
 */
export function parseStoredDateTime(value?: string | null): number {
  if (!value) return Number.NaN
  const direct = new Date(value).getTime()
  if (!Number.isNaN(direct)) return direct
  const cleaned = value.replace(/·/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return Number.NaN
  return new Date(cleaned).getTime()
}

export function relative(value: string): string {
  const diff = NOW.getTime() - new Date(value).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return fmtDate(value)
}

export function daysUntil(value: string): number {
  const diff = new Date(value).getTime() - NOW.getTime()
  return Math.ceil(diff / 86400000)
}

export function pct(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function pluralize(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`
}

export function titleCase(value: string) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
