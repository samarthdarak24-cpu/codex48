import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Info,
  Link2,
  Lightbulb,
  Paperclip,
  Send,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/layout/Shell'
import { BrandAssetsPicker } from '@/components/content/BrandAssetsPicker'
import { PosterDropzone, type PosterUploadResult } from '@/components/visual/PosterDropzone'
import { AnalysisPanel } from '@/components/visual/AnalysisPanel'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import type { Brand, ContentType } from '@/lib/types'

const TYPES: { key: ContentType; label: string; hint: string; icon: React.ElementType }[] = [
  { key: 'Text', label: 'Text Content', hint: 'Ad copy, captions, etc.', icon: FileText },
  { key: 'Image', label: 'Image', hint: 'Posters, banners, etc.', icon: ImageIcon },
  { key: 'Document', label: 'Document', hint: 'PDF, DOCX, etc.', icon: Paperclip },
  { key: 'URL', label: 'URL', hint: 'Web content, landing page', icon: Link2 },
]

const CHANNELS = ['Social Media', 'Website', 'Email', 'Influencer', 'Print', 'In-store']
const MAX_CHARS = 500

export default function NewContent() {
  const navigate = useNavigate()
  const { rules, submitContent, requestException, loading } = useData()
  const toast = useToast()

  const [type, setType] = useState<ContentType>('Text')
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState('Social Media')
  const [brand, setBrand] = useState<Brand>('PureGlow')
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<{ title?: string; text?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [exceptionOpen, setExceptionOpen] = useState(false)
  const [excReason, setExcReason] = useState('')
  const [excRule, setExcRule] = useState('BR-01')
  const [excScope, setExcScope] = useState('Campaign · single asset')
  const [excExpiry, setExcExpiry] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [poster, setPoster] = useState<PosterUploadResult | null>(null)

  const activeRules = useMemo(() => rules.filter((r) => r.status === 'active'), [rules])
  const guidance = activeRules.slice(0, 3)

  function validate() {
    const next: { title?: string; text?: string } = {}
    if (!title.trim()) next.title = 'Give your content a title so reviewers can find it.'
    else if (title.trim().length < 3) next.title = 'Use at least 3 characters.'
    if (!text.trim()) next.text = 'Add the copy you want reviewed.'
    else if (text.trim().length < 15) next.text = 'Add at least 15 characters so the guideline check is meaningful.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const submission = await submitContent({
        title: title.trim(),
        type,
        channel,
        brand,
        text: text.trim(),
        assetId: selectedAssetId ?? undefined,
      })
      toast.success(
        'Submitted for review',
        submission.issueCount > 0
          ? `${submission.issueCount} finding${submission.issueCount === 1 ? '' : 's'} raised. Open the review to see the evidence.`
          : 'No guideline issues detected. A brand manager will confirm the decision.',
      )
      navigate(`/app/feedback/${submission.id}`)
    } catch (err) {
      toast.error('Could not submit', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onRequestException() {
    if (!excReason.trim()) {
      toast.error('Reason required', 'Explain why this content cannot follow the rule.')
      return
    }
    setSubmitting(true)
    try {
      // An exception attaches to a stored content version, so the draft is saved first.
      const submission = await submitContent({
        title: title.trim() || 'Untitled draft',
        type,
        channel,
        brand,
        text: text.trim() || 'Draft submitted together with an exception request.',
        assetId: selectedAssetId ?? undefined,
      })
      await requestException({
        contentId: submission.id,
        ruleCode: excRule,
        reason: excReason.trim(),
        scope: excScope,
        expiresAt: new Date(excExpiry).toISOString(),
      })
      toast.success('Exception requested', 'A brand manager will review the request. Nothing is approved automatically.')
      setExceptionOpen(false)
      navigate(`/app/feedback/${submission.id}`)
    } catch (err) {
      toast.error('Could not request exception', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <>
      <PageHeader
        title="New Content"
        subtitle="Checked against your active brand rules before it reaches a reviewer."
        backTo="/app/overview"
        backLabel="Back to Dashboard"
        actions={
          <Button variant="outline" size="sm" icon={<ShieldAlert className="h-3.5 w-3.5" />} onClick={() => setExceptionOpen(true)}>
            Request exception
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_288px]">
        <form onSubmit={onSubmit} className="min-w-0 space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {TYPES.map((t) => {
              const active = t.key === type
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl border bg-white p-3 text-left transition-all',
                    active
                      ? 'border-brand-400 bg-brand-50/50 shadow-[0_0_0_3px_rgba(47,111,237,.10)]'
                      : 'border-line hover:border-brand-200 hover:bg-[#FBFDFF]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                      active ? 'bg-brand-500 text-white' : 'bg-[#F2F7FD] text-ink-600',
                    )}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-xs font-semibold leading-[15px]', active ? 'text-brand-700' : 'text-ink')}>
                      {t.label}
                    </span>
                    <span className="mt-0.5 block text-2xs leading-[13px] text-muted">{t.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_264px]">
            {/* Details */}
            <Card className="card-pad">
              <h2 className="mb-3.5 text-lg font-semibold tracking-[-0.01em] text-ink">Content Details</h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Content Title" required error={errors.title} htmlFor="title">
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setErrors((p) => ({ ...p, title: undefined }))
                    }}
                    placeholder="e.g. Summer Festival Campaign"
                    invalid={Boolean(errors.title)}
                    maxLength={80}
                  />
                </Field>
                <Field label="Campaign / Channel" htmlFor="channel">
                  <Select id="channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="mt-3">
                <Field label="Brand" htmlFor="brand">
                  <Select id="brand" value={brand} onChange={(e) => setBrand(e.target.value as Brand)}>
                    <option value="PureGlow">PureGlow</option>
                    <option value="WellnessLife">WellnessLife</option>
                  </Select>
                </Field>
              </div>

              <div className="mt-3">
                <Field
                  label={type === 'URL' ? 'Page copy or URL' : 'Content Text'}
                  required
                  error={errors.text}
                  htmlFor="text"
                  counter={
                    <span
                      className={cn(
                        'text-2xs font-medium tabular-nums',
                        text.length > MAX_CHARS ? 'text-danger-600' : text.length > MAX_CHARS * 0.85 ? 'text-warn-600' : 'text-muted-light',
                      )}
                    >
                      {text.length}/{MAX_CHARS}
                    </span>
                  }
                >
                  <Textarea
                    id="text"
                    rows={6}
                    value={text}
                    maxLength={MAX_CHARS}
                    onChange={(e) => {
                      setText(e.target.value)
                      setErrors((p) => ({ ...p, text: undefined }))
                    }}
                    placeholder="This summer, enjoy up to 50% off on our organic skincare products. Pure. Natural. Real results!"
                    invalid={Boolean(errors.text)}
                  />
                </Field>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setTitle('')
                    setText('')
                    setErrors({})
                    setPoster(null)
                  }}
                >
                  Clear
                </Button>
                <Button type="submit" loading={submitting} className="w-full sm:w-auto" icon={<Send className="h-3.5 w-3.5" />}>
                  Submit for Review
                </Button>
              </div>
            </Card>

            {/* Preview */}
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <CardHeader title="Content Preview" dense />
                <div className="p-3">
                  <PreviewCard title={title} text={text} brand={brand} channel={channel} />
                  <p className="mt-2 flex items-center gap-1 text-2xs text-muted-light">
                    <Info className="h-3 w-3" />
                    Live preview of the copy you entered.
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* VisualGuard — poster upload + inline analysis */}
          {(type === 'Image' || poster) && (
            <Card className="card-pad">
              <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-1.5 text-lg font-semibold tracking-[-0.01em] text-ink">
                    <ImageIcon className="h-4 w-4 text-brand-500" />
                    Poster check
                  </h2>
                  <p className="mt-0.5 text-xs leading-[18px] text-muted">
                    VisualGuard reads the text, finds logos and measures contrast on the original pixels.
                  </p>
                </div>
                <span className="rounded-full bg-grape-50 px-2 py-[2px] text-2xs font-medium text-grape-700">
                  Advisory visual analysis
                </span>
              </div>

              <div className="mt-3">
                <PosterDropzone
                  onUploaded={(result) => setPoster(result)}
                  title={title.trim() || undefined}
                  channel={channel}
                  brand={brand}
                />
              </div>

              {poster && (
                <div className="mt-4">
                  <AnalysisPanel analysisId={poster.analysisId} submissionId={poster.submissionId} />
                </div>
              )}

              {!poster && (
                <p className="mt-2 text-2xs leading-[16px] text-muted-light">
                  Stored as its own asset, so the analysis can be re-run later.
                </p>
              )}
            </Card>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-3.5 py-2.5">
            <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-brand-500" />
            <p className="text-xs leading-[18px] text-brand-700/90">
              Findings show the exact guideline passage they came from. Missing facts become “needs review”, never a pass.
            </p>
          </div>
        </form>

        {/* Right rail */}
        <div className="space-y-4">
          <BrandAssetsPicker brand={brand} selectedId={selectedAssetId} onSelect={setSelectedAssetId} />

          <Card>
            <CardHeader
              title="Before you submit"
              action={
                <button onClick={() => navigate('/app/guidelines')} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  All rules
                </button>
              }
              dense
            />
            <ul className="divide-line">
              {loading && <li className="px-4 py-3 text-xs text-muted">Loading rules…</li>}
              {!loading && guidance.length === 0 && <li className="px-4 py-3 text-xs text-muted">No active rules yet.</li>}
              {guidance.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-start gap-2 px-4 py-2.5">
                  <CheckCircle2 className="mt-[3px] h-3 w-3 shrink-0 text-success-500" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-[17px] text-ink">{r.title}</p>
                    <p className="text-2xs text-muted">{r.code} · {r.scope}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5">
              <p className="flex items-start gap-1.5 text-2xs leading-[16px] text-muted">
                <Lightbulb className="mt-[1px] h-3 w-3 shrink-0 text-warn-500" />
                Green backgrounds are the brand default for every campaign.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={exceptionOpen}
        onClose={() => setExceptionOpen(false)}
        title="Request an exception"
        description="Exceptions attach to a stored content version, so this draft is saved as a submission first."
        footer={
          <>
            <Button variant="ghost" onClick={() => setExceptionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onRequestException} loading={submitting} icon={<Sparkles className="h-3.5 w-3.5" />}>
              Submit request
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-warn-100 bg-warn-50 px-3 py-2">
            <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0 text-warn-600" />
            <p className="text-2xs leading-[15px] text-warn-700">
              An exception is not an approval. The content still goes through review, and the exception only applies to
              the scope and dates recorded here.
            </p>
          </div>

          <Field label="Rule to exempt" htmlFor="exc-rule">
            <Select id="exc-rule" value={excRule} onChange={(e) => setExcRule(e.target.value)}>
              {activeRules.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} · {r.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Reason" required htmlFor="exc-reason">
            <Textarea
              id="exc-reason"
              rows={3}
              value={excReason}
              onChange={(e) => setExcReason(e.target.value)}
              placeholder="e.g. Seasonal campaign requires a colour outside the standard palette."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Scope" htmlFor="exc-scope">
              <Input id="exc-scope" value={excScope} onChange={(e) => setExcScope(e.target.value)} />
            </Field>
            <Field label="Expires on" htmlFor="exc-expiry">
              <Input id="exc-expiry" type="date" value={excExpiry} onChange={(e) => setExcExpiry(e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

function PreviewCard({ title, text, brand, channel }: { title: string; text: string; brand: Brand; channel: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-[#FAF7EF]">
      <div className="relative flex h-[168px] flex-col justify-between bg-gradient-to-br from-[#E8F5C8] via-[#D7EFB0] to-[#B9DE7E] p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2C4A1E]/70">{brand}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[#2C4A1E]/50">Skincare</p>
          </div>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-[#2C4A1E]/70">{channel}</span>
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-[19px] text-[#1F3D12]">{title || 'Your campaign title'}</p>
          <p className="mt-1 line-clamp-3 text-[11.5px] leading-[16px] text-[#2C4A1E]/75">
            {text || 'Your content copy will preview here as you type.'}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <span className="text-[10.5px] text-muted-light">Preview only — the saved asset is what gets reviewed.</span>
        <ArrowLeft className="h-2.5 w-2.5 shrink-0 rotate-180 text-muted-light" />
      </div>
    </div>
  )
}
