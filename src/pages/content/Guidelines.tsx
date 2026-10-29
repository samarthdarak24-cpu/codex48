import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  HelpCircle,
  Lock,
  MoreHorizontal,
  Palette,
  Search,
  ShieldCheck,
  Type,
  Sparkles,
  Calendar,
  FileDown,
} from 'lucide-react'
import { useData } from '@/context/DataContext'
import { PageHeader, RailCard } from '@/components/layout/Shell'
import { Card, MetricCard, ViewAll } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Field'
import { EmptyState, Pagination } from '@/components/ui/Table'
import { Modal, Skeleton } from '@/components/ui/Misc'
import { guidelineStats, submissionStats } from '@/lib/selectors'
import { useAuth } from '@/context/AuthContext'
import { cn, fmtDate, relative } from '@/lib/utils'
import { api } from '@/services/api'
import type { GuidelineDoc } from '@/lib/types'

const PAGE_SIZE = 6

const categoryTone: Record<string, string> = {
  'Visual Identity': 'bg-[#EAF3E0] text-[#3F6B24]',
  Communication: 'bg-[#F1EBFF] text-[#55653D]',
  Claims: 'bg-[#FFF3DE] text-[#A96A0C]',
  'Visual Content': 'bg-[#FFE9EC] text-[#B0304A]',
  'Social Media': 'bg-[#E3F6EE] text-[#0A7F5A]',
  Marketing: 'bg-[#E8EFFB] text-[#314F27]',
}

export default function CreatorGuidelines() {
  const { docs, rules, claims, exceptions, audit, submissions, loading } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [version, setVersion] = useState('All Versions')
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState<GuidelineDoc | null>(null)
  const [passages, setPassages] = useState<any[]>([])
  const [searchingPassages, setSearchingPassages] = useState(false)

  useEffect(() => {
    if (query.trim().length >= 3) {
      setSearchingPassages(true)
      api.searchGuidelines(query.trim())
        .then(setPassages)
        .catch(() => setPassages([]))
        .finally(() => setSearchingPassages(false))
    } else {
      setPassages([])
    }
  }, [query])

  const visible = useMemo(() => docs.filter((d) => d.visibleToCreators), [docs])
  const stats = guidelineStats(visible, rules, claims, exceptions)
  const mine = submissions.filter((s) => s.creatorId === user?.id)
  const myStats = submissionStats(mine)

  const categories = ['All Categories', ...new Set(visible.map((d) => d.category))]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return visible.filter((d) => {
      const matchesQuery = !q || d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
      const matchesCategory = category === 'All Categories' || d.category === category
      const matchesVersion =
        version === 'All Versions' ||
        (version === 'Active' && d.status === 'active') ||
        (version === 'Draft' && d.status === 'draft') ||
        (version === 'Archived' && d.status === 'archived')
      return matchesQuery && matchesCategory && matchesVersion
    })
  }, [visible, query, category, version])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const keyRules = useMemo(() => {
    const order = ['BR-01', 'CL-03', 'TY-01', 'LO-02']
    return order
      .map((c) => rules.find((r) => r.code === c && r.status === 'active'))
      .filter(Boolean)
      .slice(0, 4)
  }, [rules])

  const recentUpdates = useMemo(
    () => audit.filter((a) => a.entityKind === 'guideline' || a.action === 'Rule updated').slice(0, 3),
    [audit],
  )

  const ruleIcons = [Palette, Type, ShieldCheck, FileText]

  return (
    <>
      <PageHeader
        title="Brand Guidelines"
        subtitle="View your brand rules, colour palette, logo guidelines, and approved claims."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-muted">
            <Lock className="h-3 w-3" />
            Read-only access
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Guidelines" value={String(stats.totalDocs).padStart(2, '0')} sub="Core brand documents" icon={<FileText className="h-4 w-4" />} tone="green" />
        <MetricCard label="Active Rules" value={String(stats.activeRules).padStart(2, '0')} sub="Currently in use" icon={<ShieldCheck className="h-4 w-4" />} tone="green" />
        <MetricCard label="Approved Claims" value={String(stats.approvedClaims).padStart(2, '0')} sub="Verified statements" icon={<CheckCircle2 className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Exceptions" value={String(stats.exceptionsWithExpiry).padStart(2, '0')} sub="With expiry dates" icon={<Clock3 className="h-4 w-4" />} tone="amber" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          {passages.length > 0 && (
            <Card className="p-3 bg-[#FAF7EF] border-line">
              <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-brand-800 flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3 w-3" />
                Matching Indexed Passages ({passages.length})
              </h3>
              <div className="space-y-2">
                {passages.map((p) => (
                  <div key={p.id} className="rounded border border-line bg-white p-2.5 text-xs">
                    <p className="text-2xs text-brand-700 font-medium">Page {p.pageNumber} · Paragraph {p.paragraphNumber}</p>
                    <p className="mt-1 text-ink-700 italic font-serif">“{p.passageText}”</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
              <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search guidelines, rules, or keywords…" className="w-full sm:w-auto flex-1 min-w-[180px]" />
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[130px] py-0 text-xs">
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
                <Select value={version} onChange={(e) => { setVersion(e.target.value); setPage(1) }} className="h-[34px] flex-1 sm:flex-initial sm:w-auto min-w-[115px] py-0 text-xs">
                  {['All Versions', 'Active', 'Draft', 'Archived'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-md font-semibold text-ink">Guideline Documents</h2>
              <span className="text-2xs text-muted">{filtered.length} document{filtered.length === 1 ? '' : 's'}</span>
            </div>

            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : paged.length === 0 ? (
              <EmptyState
                icon={<Search className="h-5 w-5" />}
                title="No guidelines match your search"
                description="Try a different keyword, category, or version filter."
                action={
                  <Button size="sm" variant="outline" onClick={() => { setQuery(''); setCategory('All Categories'); setVersion('All Versions') }}>
                    Clear filters
                  </Button>
                }
                compact
              />
            ) : (
              <ul className="divide-line">
                {paged.map((doc) => (
                  <li key={doc.id} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#FBFDFF]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F2F7FD]">
                      <DocGlyph category={doc.category} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-base font-medium text-ink">{doc.name}</p>
                        <span className="rounded bg-[#F1ECE0] px-1 py-px text-[9.5px] font-semibold text-ink-600">{doc.version}</span>
                      </div>
                      <p className="truncate text-xs leading-[16px] text-muted">{doc.description}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-2xs text-muted-light">
                        <span className="inline-flex items-center gap-1">
                          <FileDown className="h-2.5 w-2.5" />
                          {doc.fileType} · {doc.fileSize}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {fmtDate(doc.updatedAt)}
                        </span>
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setPreview(doc)}>
                      View
                    </Button>
                    <button
                      aria-label="More options"
                      className="inline-flex h-7 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-[#F1F6FD] hover:text-ink"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {filtered.length > PAGE_SIZE && (
              <div className="border-t border-line">
                <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} label="guidelines" />
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-md font-semibold text-ink">Recent Updates</h2>
              <ViewAll onClick={() => navigate('/app/feedback')} />
            </div>
            <ul className="divide-line">
              {recentUpdates.length === 0 && <li className="px-4 py-3 text-xs text-muted">No guideline updates recorded yet.</li>}
              {recentUpdates.map((u) => (
                <li key={u.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                    <FileText className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium leading-[17px] text-ink">{u.entityTitle}</p>
                    <p className="truncate text-xs leading-[16px] text-muted">{u.details}</p>
                  </div>
                  <span className="whitespace-nowrap text-2xs text-muted-light">{relative(u.at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Rail */}
        <div className="space-y-4">
          <RailCard title="Key Brand Rules" action={<ViewAll onClick={() => navigate('/app/guidelines')} />}>
            <ul className="space-y-0.5">
              {keyRules.map((rule, i) => {
                const Icon = ruleIcons[i % ruleIcons.length]
                return (
                  <li key={rule!.id}>
                    <button
                      onClick={() => setPreview(docs.find((d) => d.id === rule!.sourceDocId) ?? null)}
                      className="group flex w-full items-start gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-[#FAF7EF]"
                    >
                      <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F2F7FD] text-brand-600">
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium leading-[16px] text-ink">{rule!.title}</span>
                        <span className="block truncate text-2xs leading-[14px] text-muted">{rule!.summary}</span>
                      </span>
                      <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-muted-light" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </RailCard>

          <Card className="border-brand-100 bg-brand-50/50 p-4">
            <h2 className="flex items-center gap-1.5 text-md font-semibold text-brand-800">
              <HelpCircle className="h-3.5 w-3.5" />
              Need Help?
            </h2>
            <p className="mt-1 text-xs leading-[16px] text-brand-700/80">
              Check the brand guidelines or contact your brand manager for any questions.
            </p>
            <Button variant="outline" size="sm" block className="mt-2.5 bg-white" onClick={() => navigate('/app/feedback')}>
              View my feedback
            </Button>
          </Card>

          <div className="relative overflow-hidden rounded-xl border border-[#DCEBC8] bg-gradient-to-br from-[#EFF7E2] via-[#E6F2D4] to-[#D8EBC0] p-4">
            <p className="text-lg font-semibold leading-[22px] tracking-[-0.01em] text-[#2C4A1E]">
              One Brand.
              <br />
              One Voice.
              <br />
              Always.
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2C4A1E]/10">
                <Sparkles className="h-2 w-2 text-[#2C4A1E]/70" />
              </span>
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#2C4A1E]/60">PureGlow</span>
            </div>
            <div className="pointer-events-none absolute -bottom-6 -right-4 h-24 w-24 rounded-full bg-[#8FBF52]/25 blur-xl" />
          </div>

          <Card className="p-4">
            <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">Your submissions</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-lg font-semibold text-ink">{myStats.total}</p>
                <p className="text-2xs text-muted">total</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-success-600">{myStats.approved}</p>
                <p className="text-2xs text-muted">approved</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ''}
        description={preview ? `${preview.category} · ${preview.version} · ${preview.pages} pages` : undefined}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Download {preview?.fileType}
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-3">
            <p className="text-base leading-[20px] text-ink-600">{preview.description}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Version', value: preview.version },
                { label: 'Status', value: preview.status },
                { label: 'Extracted passages', value: String(preview.extractedPassages) },
                { label: 'Updated', value: fmtDate(preview.updatedAt) },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-line bg-[#FBFDFF] px-2.5 py-2">
                  <p className="text-2xs text-muted">{s.label}</p>
                  <p className="text-xs font-semibold capitalize text-ink">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-line bg-[#FBFDFF] p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                <BookOpen className="h-3 w-3" />
                Extracted rule sources
              </p>
              <ul className="space-y-1.5">
                {rules
                  .filter((r) => r.sourceDocId === preview.id)
                  .map((r) => (
                    <li key={r.id} className="text-xs leading-[17px] text-ink-600">
                      <span className="font-semibold text-ink">{r.code}</span> · {r.title}
                      <span className="ml-1 text-muted-light">p.{r.sourcePage}</span>
                    </li>
                  ))}
                {rules.filter((r) => r.sourceDocId === preview.id).length === 0 && (
                  <li className="text-xs text-muted">No structured rules extracted from this document yet.</li>
                )}
              </ul>
            </div>
            <p className="text-2xs text-muted-light">
              Document text extraction and page-level citations are handled by the backend document service. This
              preview shows the metadata currently stored for the document.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

function DocGlyph({ category }: { category: string }) {
  const map: Record<string, React.ReactNode> = {
    'Visual Identity': <Palette className="h-4 w-4 text-[#5B8C2A]" />,
    Communication: <Type className="h-4 w-4 text-[#6A7C4E]" />,
    Claims: <CheckCircle2 className="h-4 w-4 text-[#D98A12]" />,
    'Visual Content': <FileText className="h-4 w-4 text-[#B0304A]" />,
    'Social Media': <Sparkles className="h-4 w-4 text-[#0A7F5A]" />,
    Marketing: <BookOpen className="h-4 w-4 text-[#314F27]" />,
  }
  return <>{map[category] ?? <FileText className="h-4 w-4 text-brand-500" />}</>
}
