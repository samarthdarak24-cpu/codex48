import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  MoreHorizontal,
  Plus,
  Quote,
  ShieldCheck,
  Sparkles,
  Upload,
  Workflow,
  Layers,
  ArrowUpRight,
} from 'lucide-react'
import { useData } from '@/context/DataContext'
import { PageHeader, QuickAction, RailCard } from '@/components/layout/Shell'
import { Card, MetricCard, ViewAll } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, SearchInput, Select, Textarea } from '@/components/ui/Field'
import { DataTable, EmptyState, Pagination, type Column } from '@/components/ui/Table'
import { PriorityBadge, RuleBadge, Badge } from '@/components/ui/Badge'
import { Modal, ProgressBar, Tabs } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { detectConflicts, guidelineStats, mostOverridden } from '@/lib/selectors'
import { cn, fmtDate, relative } from '@/lib/utils'
import type { ApprovedClaim, GuidelineDoc, Rule } from '@/lib/types'

const PAGE_SIZE = 8

const CATEGORIES: GuidelineDoc['category'][] = [
  'Visual Identity',
  'Communication',
  'Claims',
  'Visual Content',
  'Social Media',
  'Marketing',
]

const categoryChip: Record<string, string> = {
  'Visual Identity': 'bg-[#EAF3E0] text-[#3F6B24]',
  Communication: 'bg-[#F1EBFF] text-[#55653D]',
  Claims: 'bg-[#FFF3DE] text-[#A96A0C]',
  'Visual Content': 'bg-[#FFE9EC] text-[#B0304A]',
  'Social Media': 'bg-[#E3F6EE] text-[#0A7F5A]',
  Marketing: 'bg-[#E8EFFB] text-[#314F27]',
}

export default function GuidelinesRules() {
  const { docs, rules, claims, exceptions, audit, loading, addDocument, setDocStatus, addRule, confirmRule, rejectRule, addClaim } = useData()
  const navigate = useNavigate()
  const toast = useToast()

  const [tab, setTab] = useState<'guidelines' | 'rules' | 'claims'>('guidelines')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [version, setVersion] = useState('All Versions')
  const [page, setPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [ruleOpen, setRuleOpen] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [detailDoc, setDetailDoc] = useState<GuidelineDoc | null>(null)
  const [detailRule, setDetailRule] = useState<Rule | null>(null)
  const [busy, setBusy] = useState(false)

  // upload form
  const [docName, setDocName] = useState('')
  const [docDesc, setDocDesc] = useState('')
  const [docCategory, setDocCategory] = useState<GuidelineDoc['category']>('Visual Identity')
  const [docFile, setDocFile] = useState<{ name: string; size: string; type: 'PDF' | 'DOCX'; pages: number } | null>(null)

  // rule form
  const [ruleTitle, setRuleTitle] = useState('')
  const [ruleSummary, setRuleSummary] = useState('')
  const [ruleSubject, setRuleSubject] = useState('Visual background')
  const [ruleCondition, setRuleCondition] = useState('')
  const [ruleAction, setRuleAction] = useState('')
  const [ruleScope, setRuleScope] = useState('All brands · All channels')
  const [rulePriority, setRulePriority] = useState<Rule['priority']>('Medium')
  const [ruleDoc, setRuleDoc] = useState(docs[0]?.id ?? '')
  const [rulePassage, setRulePassage] = useState('')
  const [rulePage, setRulePage] = useState(1)

  // claim form
  const [claimText, setClaimText] = useState('')
  const [claimProduct, setClaimProduct] = useState('PureGlow Skincare')
  const [claimScope, setClaimScope] = useState('PureGlow · All channels')

  const stats = guidelineStats(docs, rules, claims, exceptions)
  const conflicts = useMemo(() => detectConflicts(rules), [rules])
  const overridden = useMemo(() => mostOverridden(rules, 4), [rules])

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs.filter((d) => {
      const matchesQuery = !q || d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
      const matchesCategory = category === 'All Categories' || d.category === category
      const matchesVersion =
        version === 'All Versions' ||
        (version === 'Active' && d.status === 'active') ||
        (version === 'Draft' && d.status === 'draft') ||
        (version === 'Archived' && d.status === 'archived')
      return matchesQuery && matchesCategory && matchesVersion
    })
  }, [docs, query, category, version])

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rules.filter((r) => !q || r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q))
  }, [rules, query])

  const filteredClaims = useMemo(() => {
    const q = query.trim().toLowerCase()
    return claims.filter((c) => !q || c.text.toLowerCase().includes(q) || c.product.toLowerCase().includes(q))
  }, [claims, query])

  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pagedRules = filteredRules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pagedClaims = filteredClaims.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const recentUpdates = useMemo(
    () => audit.filter((a) => a.entityKind === 'guideline' || a.action === 'Rule updated').slice(0, 4),
    [audit],
  )

  const docColumns: Column<GuidelineDoc>[] = [
    {
      key: 'name',
      header: 'Document Name',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F7FD] text-brand-600">
            <FileText className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-medium leading-[17px] text-ink">{row.name}</p>
            <p className="truncate text-2xs leading-[14px] text-muted">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      width: '128px',
      cell: (row) => (
        <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-2xs font-medium', categoryChip[row.category])}>{row.category}</span>
      ),
    },
    { key: 'version', header: 'Version', width: '70px', cell: (row) => <span className="text-xs font-medium text-ink-600">{row.version}</span> },
    {
      key: 'updated',
      header: 'Last Updated',
      width: '112px',
      cell: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-xs text-ink-600">{fmtDate(row.updatedAt)}</p>
          <p className="text-2xs text-muted-light">{row.fileType} · {row.fileSize}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '92px',
      cell: (row) => (
        <Badge tone={row.status === 'active' ? 'success' : row.status === 'draft' ? 'warn' : 'neutral'}>
          {row.status === 'active' ? 'Active' : row.status === 'draft' ? 'Draft' : 'Archived'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '84px',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setDetailDoc(row)}>
            View
          </Button>
          <button
            aria-label="More options"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-7 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-[#F1F6FD] hover:text-ink"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  const ruleColumns: Column<Rule>[] = [
    {
      key: 'rule',
      header: 'Rule',
      cell: (row) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-base font-medium leading-[17px] text-ink">
            <span className="rounded bg-[#F1ECE0] px-1 py-px text-[9.5px] font-semibold text-ink-600">{row.code}</span>
            {row.title}
          </p>
          <p className="truncate text-2xs leading-[14px] text-muted">{row.summary}</p>
        </div>
      ),
    },
    { key: 'subject', header: 'Subject', width: '118px', cell: (row) => <span className="text-xs text-ink-600">{row.subject}</span> },
    { key: 'scope', header: 'Scope', width: '150px', cell: (row) => <span className="truncate text-xs text-muted">{row.scope}</span> },
    { key: 'priority', header: 'Priority', width: '80px', cell: (row) => <PriorityBadge priority={row.priority} /> },
    { key: 'status', header: 'Status', width: '128px', cell: (row) => <RuleBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      width: '104px',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === 'needs_confirmation' || row.status === 'draft' ? (
            <>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  confirmRule(row.id)
                  toast.success('Rule activated', `${row.code} is now part of the active rule set.`)
                }}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-danger-200 text-danger-700 hover:bg-danger-50"
                onClick={() => {
                  rejectRule(row.id)
                  toast.success('Rule rejected', `${row.code} has been marked rejected.`)
                }}
              >
                Reject
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setDetailRule(row)}>
              View
            </Button>
          )}
        </div>
      ),
    },
  ]

  const claimColumns: Column<ApprovedClaim>[] = [
    {
      key: 'claim',
      header: 'Claim',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-base font-medium leading-[17px] text-ink">“{row.text}”</p>
          <p className="truncate text-2xs leading-[14px] text-muted">{row.source}</p>
        </div>
      ),
    },
    { key: 'product', header: 'Product', width: '150px', cell: (row) => <span className="truncate text-xs text-ink-600">{row.product}</span> },
    { key: 'scope', header: 'Scope', width: '150px', cell: (row) => <span className="truncate text-xs text-muted">{row.scope}</span> },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      cell: (row) => (
        <Badge tone={row.status === 'approved' ? 'success' : row.status === 'needs_review' ? 'warn' : 'neutral'}>
          {row.status === 'needs_review' ? 'Needs review' : row.status === 'approved' ? 'Approved' : 'Retired'}
        </Badge>
      ),
    },
    { key: 'approved', header: 'Approved', width: '96px', cell: (row) => <span className="whitespace-nowrap text-xs text-muted">{fmtDate(row.approvedAt)}</span> },
  ]

  async function submitUpload() {
    if (!docName.trim() || !docFile) {
      toast.error('Missing details', 'Add a document name and choose a file.')
      return
    }
    setBusy(true)
    try {
      await addDocument({
        name: docName.trim(),
        description: docDesc.trim() || 'Uploaded brand guideline document.',
        category: docCategory,
        fileType: docFile.type,
        fileSize: docFile.size,
        pages: docFile.pages,
      })
      toast.success('Document uploaded', 'Text extraction is queued. Extracted rules must be confirmed before activation.')
      setUploadOpen(false)
      setDocName('')
      setDocDesc('')
      setDocFile(null)
    } finally {
      setBusy(false)
    }
  }

  async function submitRule() {
    if (!ruleTitle.trim() || !ruleCondition.trim() || !ruleAction.trim()) {
      toast.error('Missing fields', 'A rule needs a title, condition and action.')
      return
    }
    if (!rulePassage.trim()) {
      toast.error('Evidence required', 'Paste the source passage so the rule stays traceable to the guideline.')
      return
    }
    setBusy(true)
    try {
      await addRule({
        title: ruleTitle.trim(),
        summary: ruleSummary.trim() || ruleAction.trim(),
        subject: ruleSubject,
        condition: ruleCondition.trim(),
        action: ruleAction.trim(),
        scope: ruleScope,
        priority: rulePriority,
        sourceDocId: ruleDoc,
        sourcePassage: rulePassage.trim(),
        sourcePage: rulePage,
      })
      toast.success('Rule draft created', 'Drafts never affect reviews until a manager confirms them.')
      setRuleOpen(false)
      setRuleTitle('')
      setRuleSummary('')
      setRuleCondition('')
      setRuleAction('')
      setRulePassage('')
    } finally {
      setBusy(false)
    }
  }

  async function submitClaim() {
    if (!claimText.trim()) {
      toast.error('Claim required', 'Enter the exact approved wording.')
      return
    }
    setBusy(true)
    try {
      await addClaim({ text: claimText.trim(), product: claimProduct, scope: claimScope })
      toast.success('Claim added', 'The claim is now available to the rule engine.')
      setClaimOpen(false)
      setClaimText('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Guidelines & Rules"
        subtitle="Manage your brand guidelines, rules and approved claims."
        backTo="/manager/overview"
        backLabel="Back to Dashboard"
        actions={
          <Button
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => (tab === 'guidelines' ? setUploadOpen(true) : tab === 'rules' ? setRuleOpen(true) : setClaimOpen(true))}
          >
            Add New
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Guidelines" value={String(stats.totalDocs).padStart(2, '0')} sub="Core brand documents" icon={<FileText className="h-4 w-4" />} tone="blue" />
        <MetricCard label="Active Rules" value={String(stats.activeRules).padStart(2, '0')} sub="Currently in use" icon={<ShieldCheck className="h-4 w-4" />} tone="green" />
        <MetricCard label="Approved Claims" value={String(stats.approvedClaims).padStart(2, '0')} sub="Verified statements" icon={<CheckCircle2 className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Exceptions" value={String(stats.exceptionsWithExpiry).padStart(2, '0')} sub="With expiry dates" icon={<Clock3 className="h-4 w-4" />} tone="purple" onClick={() => navigate('/manager/exceptions')} />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_286px]">
        <Card className="min-w-0">
          <div className="px-4 pt-1">
            <Tabs
              items={[
                { key: 'guidelines', label: 'Guidelines', count: docs.length },
                { key: 'rules', label: 'Rules', count: rules.length },
                { key: 'claims', label: 'Approved Claims', count: claims.length },
              ]}
              active={tab}
              onChange={(k) => {
                setTab(k as typeof tab)
                setQuery('')
                setPage(1)
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <SearchInput
              value={query}
              onChange={(v) => { setQuery(v); setPage(1) }}
              placeholder={tab === 'guidelines' ? 'Search guidelines or rules…' : tab === 'rules' ? 'Search rules…' : 'Search approved claims…'}
              className="w-full sm:w-auto flex-1 min-w-[180px]"
            />
            {tab === 'guidelines' && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[130px] py-0 text-xs">
                  {['All Categories', ...CATEGORIES].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
                <Select value={version} onChange={(e) => { setVersion(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[112px] py-0 text-xs">
                  {['All Versions', 'Active', 'Draft', 'Archived'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </Select>
              </div>
            )}
            <Button
              className="w-full sm:w-auto sm:ml-auto"
              icon={tab === 'guidelines' ? <Upload className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              onClick={() => (tab === 'guidelines' ? setUploadOpen(true) : tab === 'rules' ? setRuleOpen(true) : setClaimOpen(true))}
            >
              {tab === 'guidelines' ? 'Upload Document' : tab === 'rules' ? 'Create Rule' : 'Add Claim'}
            </Button>
          </div>

          {tab === 'guidelines' && (
            <>
              <DataTable
                columns={docColumns}
                rows={pagedDocs}
                loading={loading}
                minWidth="640px"
                getKey={(r) => r.id}
                onRowClick={(r) => setDetailDoc(r)}
                empty={<EmptyState title="No guideline documents" description="Upload a PDF or DOCX guideline to begin extracting rules." action={<Button size="sm" onClick={() => setUploadOpen(true)}>Upload Document</Button>} />}
              />
              {filteredDocs.length > PAGE_SIZE && (
                <div className="border-t border-line">
                  <Pagination page={page} pageSize={PAGE_SIZE} total={filteredDocs.length} onPage={setPage} label="guidelines" />
                </div>
              )}
            </>
          )}

          {tab === 'rules' && (
            <>
              {conflicts.length > 0 && (
                <div className="mx-3 mt-3 rounded-lg border border-danger-100 bg-danger-50/70 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-danger-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {conflicts.length} rule conflict{conflicts.length === 1 ? '' : 's'} detected
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {conflicts.map((c, i) => (
                      <li key={i} className="text-2xs leading-[15px] text-danger-700/80">
                        {c.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <DataTable
                columns={ruleColumns}
                rows={pagedRules}
                loading={loading}
                minWidth="640px"
                getKey={(r) => r.id}
                onRowClick={(r) => setDetailRule(r)}
                empty={<EmptyState title="No rules yet" description="Create a rule draft or confirm extracted rules from an uploaded guideline." action={<Button size="sm" onClick={() => setRuleOpen(true)}>Create Rule</Button>} />}
              />
              {filteredRules.length > PAGE_SIZE && (
                <div className="border-t border-line">
                  <Pagination page={page} pageSize={PAGE_SIZE} total={filteredRules.length} onPage={setPage} label="rules" />
                </div>
              )}
            </>
          )}

          {tab === 'claims' && (
            <>
              <DataTable
                columns={claimColumns}
                rows={pagedClaims}
                loading={loading}
                minWidth="540px"
                getKey={(r) => r.id}
                empty={<EmptyState title="No approved claims" description="Add the exact wording your teams are allowed to use." action={<Button size="sm" onClick={() => setClaimOpen(true)}>Add Claim</Button>} />}
              />
              {filteredClaims.length > PAGE_SIZE && (
                <div className="border-t border-line">
                  <Pagination page={page} pageSize={PAGE_SIZE} total={filteredClaims.length} onPage={setPage} label="claims" />
                </div>
              )}
            </>
          )}
        </Card>

        {/* Rail */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-1.5 flex items-center gap-1.5 text-md font-semibold text-ink">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              Quick Actions
            </h2>
            <div className="space-y-0.5">
              <QuickAction icon={<Upload className="h-3 w-3" />} label="Upload Guideline Document" description="Add new brand guidelines or policy docs" onClick={() => setUploadOpen(true)} />
              <QuickAction icon={<Plus className="h-3 w-3" />} label="Create New Rule" description="Define a new brand rule or restriction" tone="success" onClick={() => setRuleOpen(true)} />
              <QuickAction icon={<CheckCircle2 className="h-3 w-3" />} label="Add Approved Claim" description="Register a verified claim statement" tone="warn" onClick={() => setClaimOpen(true)} />
              <QuickAction icon={<Clock3 className="h-3 w-3" />} label="Manage Exceptions" description="Set temporary rule exceptions" tone="grape" onClick={() => navigate('/manager/exceptions')} />
            </div>
          </Card>

          <RailCard title="Rule Categories" icon={<Layers className="h-3.5 w-3.5" />} action={<ViewAll onClick={() => { setTab('rules'); setQuery('') }} label="View all" />}>
            <ul className="space-y-1.5">
              {Object.entries(
                rules.reduce<Record<string, number>>((acc, r) => {
                  acc[r.subject] = (acc[r.subject] ?? 0) + 1
                  return acc
                }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([label, value], i) => (
                  <li key={label} className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        ['bg-brand-500', 'bg-grape-500', 'bg-warn-500', 'bg-danger-500', 'bg-success-500', 'bg-[#8C8578]'][i % 6],
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-600">{label}</span>
                    <span className="text-xs font-semibold text-ink">{value}</span>
                  </li>
                ))}
            </ul>
          </RailCard>

          <RailCard title="Guideline Health" icon={<Workflow className="h-3.5 w-3.5" />}>
            <p className="mb-2 text-[9.5px] leading-[13px] text-muted-light">
              Most frequently overridden active rules this quarter — a signal that the rule may need clarifying.
            </p>
            <ul className="space-y-2">
              {overridden.length === 0 && <li className="text-xs text-muted">No rules have been overridden this quarter.</li>}
              {overridden.map((r) => (
                <li key={r.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-ink-600">{r.title}</span>
                    <span className="text-2xs font-semibold text-ink">{r.overridesThisQuarter}×</span>
                  </div>
                  <ProgressBar
                    value={(r.overridesThisQuarter / Math.max(...overridden.map((x) => x.overridesThisQuarter), 1)) * 100}
                    tone={r.overridesThisQuarter > 4 ? 'danger' : r.overridesThisQuarter > 2 ? 'warn' : 'brand'}
                    height={4}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-2.5 border-t border-line pt-2">
              <p className="flex items-center justify-between text-2xs">
                <span className="text-muted">Expired exceptions</span>
                <span className="font-semibold text-ink">{exceptions.filter((e) => e.status === 'Expired').length}</span>
              </p>
              <p className="mt-1 flex items-center justify-between text-2xs">
                <span className="text-muted">Rules awaiting confirmation</span>
                <span className="font-semibold text-ink">{stats.rulesToConfirm + stats.draftRules}</span>
              </p>
            </div>
          </RailCard>

          <RailCard title="Recent Guideline Updates" action={<ViewAll onClick={() => navigate('/manager/audit')} />}>
            <ul className="space-y-2">
              {recentUpdates.map((u) => (
                <li key={u.id} className="flex items-start gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium leading-[15px] text-ink">{u.entityTitle}</p>
                    <p className="truncate text-2xs leading-[13px] text-muted">
                      {u.entityMeta} · {relative(u.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </RailCard>
        </div>
      </div>

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload guideline document"
        description="PDF and DOCX are parsed by the document service. Extracted rules stay inactive until confirmed."
        footer={
          <>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={submitUpload} loading={busy} icon={<Upload className="h-3.5 w-3.5" />}>Upload</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Document name" required htmlFor="doc-name">
            <Input id="doc-name" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Brand Identity Guidelines" />
          </Field>
          <Field label="Description" htmlFor="doc-desc">
            <Input id="doc-desc" value={docDesc} onChange={(e) => setDocDesc(e.target.value)} placeholder="What does this document govern?" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="doc-cat">
              <Select id="doc-cat" value={docCategory} onChange={(e) => setDocCategory(e.target.value as GuidelineDoc['category'])}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="File" required htmlFor="doc-file">
              <input
                id="doc-file"
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setDocFile({
                    name: f.name,
                    size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
                    type: f.name.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF',
                    pages: Math.max(1, Math.round(f.size / 42000)),
                  })
                  if (!docName) setDocName(f.name.replace(/\.(pdf|docx)$/i, ''))
                }}
                className="w-full rounded-lg border border-line-strong bg-white px-2 py-[7px] text-2xs text-ink-600 file:mr-2 file:rounded file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-2xs file:font-medium file:text-brand-700"
              />
            </Field>
          </div>
          {docFile && (
            <div className="rounded-lg border border-line bg-[#FBFDFF] px-3 py-2 text-2xs text-ink-600">
              <p className="font-medium">{docFile.name}</p>
              <p className="text-muted">
                {docFile.type} · {docFile.size} · ~{docFile.pages} pages
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Rule modal */}
      <Modal
        open={ruleOpen}
        onClose={() => setRuleOpen(false)}
        title="Create a rule draft"
        description="Every rule must cite the passage it came from. Drafts are never applied to reviews."
        width="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRuleOpen(false)}>Cancel</Button>
            <Button onClick={submitRule} loading={busy} icon={<Plus className="h-3.5 w-3.5" />}>Save draft</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Rule title" required htmlFor="r-title" className="sm:col-span-2">
            <Input id="r-title" value={ruleTitle} onChange={(e) => setRuleTitle(e.target.value)} placeholder="e.g. Approved background colours" />
          </Field>
          <Field label="Summary" htmlFor="r-sum" className="sm:col-span-2">
            <Input id="r-sum" value={ruleSummary} onChange={(e) => setRuleSummary(e.target.value)} placeholder="One-line description shown to creators" />
          </Field>
          <Field label="Subject" htmlFor="r-sub">
            <Select id="r-sub" value={ruleSubject} onChange={(e) => setRuleSubject(e.target.value)}>
              {['Visual background', 'Logo', 'Product claim', 'Health claim', 'Typography', 'Tone of voice', 'Disclosure', 'Imagery', 'Asset format'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Priority" htmlFor="r-pri">
            <Select id="r-pri" value={rulePriority} onChange={(e) => setRulePriority(e.target.value as Rule['priority'])}>
              {['High', 'Medium', 'Low'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Condition" required htmlFor="r-cond" hint="Deterministic expression evaluated by the rule engine.">
            <Input id="r-cond" value={ruleCondition} onChange={(e) => setRuleCondition(e.target.value)} placeholder="background.colour NOT IN palette.approved" />
          </Field>
          <Field label="Action" required htmlFor="r-act">
            <Input id="r-act" value={ruleAction} onChange={(e) => setRuleAction(e.target.value)} placeholder="Block publication until corrected" />
          </Field>
          <Field label="Scope" htmlFor="r-scope">
            <Input id="r-scope" value={ruleScope} onChange={(e) => setRuleScope(e.target.value)} />
          </Field>
          <Field label="Source document" htmlFor="r-doc">
            <Select id="r-doc" value={ruleDoc} onChange={(e) => setRuleDoc(e.target.value)}>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.version})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source passage" required htmlFor="r-pass" className="sm:col-span-2" hint="Verbatim text from the guideline. Shown as evidence in reviews.">
            <Textarea id="r-pass" rows={3} value={rulePassage} onChange={(e) => setRulePassage(e.target.value)} placeholder="Paste the exact sentence(s) from the document…" />
          </Field>
          <Field label="Page number" htmlFor="r-page">
            <Input id="r-page" type="number" min={1} value={rulePage} onChange={(e) => setRulePage(Number(e.target.value))} />
          </Field>
        </div>
      </Modal>

      {/* Claim modal */}
      <Modal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        title="Add approved claim"
        description="Use the exact wording teams are allowed to publish."
        footer={
          <>
            <Button variant="ghost" onClick={() => setClaimOpen(false)}>Cancel</Button>
            <Button onClick={submitClaim} loading={busy} icon={<Plus className="h-3.5 w-3.5" />}>Add claim</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Claim wording" required htmlFor="c-text">
            <Input id="c-text" value={claimText} onChange={(e) => setClaimText(e.target.value)} placeholder="e.g. Dermatologically tested" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Product" htmlFor="c-prod">
              <Input id="c-prod" value={claimProduct} onChange={(e) => setClaimProduct(e.target.value)} />
            </Field>
            <Field label="Scope" htmlFor="c-scope">
              <Input id="c-scope" value={claimScope} onChange={(e) => setClaimScope(e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Document detail */}
      <Modal
        open={Boolean(detailDoc)}
        onClose={() => setDetailDoc(null)}
        title={detailDoc?.name ?? ''}
        description={detailDoc ? `${detailDoc.category} · ${detailDoc.version} · ${detailDoc.pages} pages` : undefined}
        width="max-w-2xl"
        footer={
          detailDoc ? (
            <>
              <Button variant="ghost" onClick={() => setDetailDoc(null)}>Close</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDocStatus(detailDoc.id, detailDoc.status === 'active' ? 'archived' : 'active')
                  toast.success('Document updated', `Version ${detailDoc.version} is now ${detailDoc.status === 'active' ? 'archived' : 'active'}.`)
                  setDetailDoc(null)
                }}
              >
                {detailDoc.status === 'active' ? 'Archive version' : 'Activate version'}
              </Button>
            </>
          ) : null
        }
      >
        {detailDoc && (
          <div className="space-y-3">
            <p className="text-base leading-[20px] text-ink-600">{detailDoc.description}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Status', value: detailDoc.status },
                { label: 'File', value: `${detailDoc.fileType} · ${detailDoc.fileSize}` },
                { label: 'Passages', value: String(detailDoc.extractedPassages) },
                { label: 'Updated', value: fmtDate(detailDoc.updatedAt) },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-line bg-[#FBFDFF] px-2.5 py-2">
                  <p className="text-2xs text-muted">{s.label}</p>
                  <p className="text-xs font-semibold capitalize text-ink">{s.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Rules sourced from this document</p>
              <ul className="space-y-1.5">
                {rules.filter((r) => r.sourceDocId === detailDoc.id).map((r) => (
                  <li key={r.id} className="rounded-lg border border-line p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">
                        <span className="mr-1.5 rounded bg-[#F1ECE0] px-1 py-px text-[9.5px] font-semibold text-ink-600">{r.code}</span>
                        {r.title}
                      </p>
                      <RuleBadge status={r.status} />
                    </div>
                    <p className="mt-1 flex items-start gap-1 border-l-2 border-brand-200 pl-2 text-2xs italic leading-[15px] text-ink-600">
                      <Quote className="mt-[2px] h-2.5 w-2.5 shrink-0 not-italic text-brand-300" />
                      {r.sourcePassage}
                    </p>
                    <p className="mt-1 text-[9.5px] text-muted-light">p.{r.sourcePage} · {r.sourceVersion}</p>
                  </li>
                ))}
                {rules.filter((r) => r.sourceDocId === detailDoc.id).length === 0 && (
                  <li className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-xs text-muted">
                    No rules extracted from this document yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Rule detail */}
      <Modal
        open={Boolean(detailRule)}
        onClose={() => setDetailRule(null)}
        title={detailRule ? `${detailRule.code} · ${detailRule.title}` : ''}
        description={detailRule?.summary}
        width="max-w-xl"
        footer={
          detailRule ? (
            <>
              <Button variant="ghost" onClick={() => setDetailRule(null)}>Close</Button>
              {detailRule.status !== 'active' && detailRule.status !== 'rejected' && (
                <>
                  <Button
                    variant="outline"
                    className="border-danger-300 text-danger-700 hover:bg-danger-50"
                    onClick={() => {
                      rejectRule(detailRule.id)
                      toast.success('Rule rejected', `${detailRule.code} has been rejected.`)
                      setDetailRule(null)
                    }}
                  >
                    Reject rule
                  </Button>
                  <Button
                    onClick={() => {
                      confirmRule(detailRule.id)
                      toast.success('Rule activated', `${detailRule.code} is now active.`)
                      setDetailRule(null)
                    }}
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    Confirm & activate
                  </Button>
                </>
              )}
            </>
          ) : null
        }
      >
        {detailRule && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Status', value: detailRule.status.replace('_', ' ') },
                { label: 'Priority', value: detailRule.priority },
                { label: 'Scope', value: detailRule.scope },
                { label: 'Overridden', value: `${detailRule.overridesThisQuarter}× this quarter` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-line bg-[#FBFDFF] px-2.5 py-2">
                  <p className="text-2xs text-muted">{s.label}</p>
                  <p className="text-xs font-semibold capitalize text-ink">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-line p-2.5">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Rule logic</p>
              <dl className="mt-1.5 space-y-1 text-xs">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Subject</dt>
                  <dd className="text-ink-600">{detailRule.subject}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Condition</dt>
                  <dd className="font-mono text-[11px] text-ink-600">{detailRule.condition}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Action</dt>
                  <dd className="text-ink-600">{detailRule.action}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-2.5">
              <p className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-[0.05em] text-brand-700">
                <BookOpen className="h-2.5 w-2.5" />
                {docs.find((d) => d.id === detailRule.sourceDocId)?.name ?? 'Guideline'} · {detailRule.sourceVersion} · p.
                {detailRule.sourcePage}
              </p>
              <p className="mt-1 border-l-2 border-brand-300 pl-2 text-2xs italic leading-[16px] text-ink-600">
                “{detailRule.sourcePassage}”
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
