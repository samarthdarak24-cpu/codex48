import { api } from '@/services/api'
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

export function exportRulesCsv(
  rulesList: Array<{ code: string; title: string; category?: string; priority: string; status: string; condition?: string; action?: string; sourcePassage?: string }>
) {
  const headers = ['Code', 'Title', 'Category', 'Priority', 'Status', 'Condition', 'Action', 'Source Passage']
  const rows = rulesList.map(r => [
    `"${(r.code || '').replace(/"/g, '""')}"`,
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.category || 'General').replace(/"/g, '""')}"`,
    `"${(r.priority || 'Medium').replace(/"/g, '""')}"`,
    `"${(r.status || 'active').replace(/"/g, '""')}"`,
    `"${(r.condition || '').replace(/"/g, '""')}"`,
    `"${(r.action || '').replace(/"/g, '""')}"`,
    `"${(r.sourcePassage || '').replace(/"/g, '""')}"`,
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `brand-rules-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}


function createClientPdfBlob(title: string, lines: string[]): Blob {
  const streamContent = [
    'BT',
    '/F1 16 Tf',
    '50 740 Td',
    '(' + title.replace(/([\\()])/g, '\\$1') + ') Tj',
    '/F1 10 Tf',
    ...lines.flatMap((line) => [
      '0 -16 Td',
      '(' + line.replace(/([\\()])/g, '\\$1') + ') Tj',
    ]),
    'ET',
  ].join('\n')

  const streamLength = new TextEncoder().encode(streamContent).length
  const pdfString = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    'endobj',
    '4 0 obj',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    'endobj',
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000236 00000 n ',
    '0000000305 00000 n ',
    'trailer',
    '<< /Size 6 /Root 1 0 R >>',
    'startxref',
    '400',
    '%%EOF',
  ].join('\n')

  return new Blob([pdfString], { type: 'application/pdf' })
}

export async function downloadGuidelineDocument(
  doc: { id?: string; name?: string; title?: string; version?: string; category?: string; status?: string; description?: string; fileType?: string; fileSize?: string; pages?: number; updatedAt?: string },
  docRules: Array<{ code: string; title: string; priority?: string; status?: string; sourcePassage?: string; sourcePage?: number; sourceVersion?: string; summary?: string }> = []
) {
  const docName = doc.name || doc.title || 'brand-guideline'
  const docVer = doc.version || '1.0'
  const safeBase = docName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const filename = `${safeBase}-${docVer}.pdf`

  // 1. Try to fetch publication-grade PDF from server
  if (doc.id) {
    try {
      const blob = await api.downloadGuidelinePdf(doc.id, 'pdf')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return
    } catch (err) {
      console.warn('Backend PDF download error, using high-fidelity client PDF fallback:', err)
    }
  }

  // 2. High-fidelity client PDF fallback (strict .pdf format, never .md)
  const lines: string[] = [
    `Category: ${doc.category || 'Visual Identity'}  |  Version: ${docVer}  |  Status: ${(doc.status || 'Active').toUpperCase()}`,
    `Format: ${doc.fileType || 'PDF'} (~${doc.pages || 1} pages)`,
    '',
    '--- 1. GOVERNANCE SCOPE & OVERVIEW ---',
    doc.description || 'Official brand policy standard establishing compliance rules.',
    '',
    `--- 2. EXTRACTED ENFORCEABLE RULES (${docRules.length} rules) ---`,
  ]

  if (docRules.length === 0) {
    lines.push('No active rules mapped to this document yet.')
  } else {
    docRules.forEach((r, i) => {
      lines.push(`${i + 1}. [${r.code}] ${r.title} (${(r.priority || 'Medium').toUpperCase()})`)
      if (r.sourcePassage) {
        lines.push(`   Citation: "${r.sourcePassage.slice(0, 85)}..." (p.${r.sourcePage || 1})`)
      }
      if (r.summary && r.summary !== r.title) {
        lines.push(`   Summary: ${r.summary}`)
      }
    })
  }

  lines.push('', '--- Precedent Certified Brand Governance Export ---')

  const pdfBlob = createClientPdfBlob(`Brand Guideline: ${docName} (${docVer})`, lines)
  const url = URL.createObjectURL(pdfBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
