import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  FileType,
  Globe,
  Image as ImageIcon,
  Info,
  Link2,
  Loader2,
  Lightbulb,
  Maximize2,
  Paperclip,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api } from '@/services/api'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/layout/Shell'
import { BrandAssetsPicker } from '@/components/content/BrandAssetsPicker'
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
const TEXT_FORMATS = ['Ad Copy', 'Social Caption', 'Headline & Body', 'Email Newsletter']
const IMAGE_ASPECT_RATIOS = ['1:1 Square', '9:16 Story/Reel', '16:9 Banner', '4:5 Portrait']
const IMAGE_PLACEMENTS = ['Social Media Feed', 'Hero Banner', 'Display Ad', 'Product Card']
const DOC_CATEGORIES = [
  'Brand Guidelines & Style Guide',
  'Packaging & Product Label',
  'Marketing Collateral & Deck',
  'Press Release & Whitepaper',
  'Legal & Compliance Deck',
]
const URL_PAGE_TYPES = [
  'Campaign Landing Page',
  'Product Detail Page (PDP)',
  'Homepage Hero Section',
  'Blog Post / Article',
  'Email Web Version',
]

const MAX_CHARS = 1000

export default function NewContent() {
  const navigate = useNavigate()
  const { rules, submitContent, requestException, loading } = useData()
  const toast = useToast()

  // 1. Content Type Selector (Text is default)
  const [type, setType] = useState<ContentType>('Text')

  // 2. Common Fields (Same across all options)
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState('Social Media')
  const [brand, setBrand] = useState<Brand>('PureGlow')

  // 3. Option-Specific: Text Content
  const [textFormat, setTextFormat] = useState('Ad Copy')
  const [textCopy, setTextCopy] = useState('')

  // 4. Option-Specific: Image
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1 Square')
  const [imagePlacement, setImagePlacement] = useState('Social Media Feed')
  const [imageText, setImageText] = useState('')

  // 5. Option-Specific: Document
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docCategory, setDocCategory] = useState(DOC_CATEGORIES[0])
  const [docScope, setDocScope] = useState('Full Document')
  const [docExcerpt, setDocExcerpt] = useState('')

  // 6. Option-Specific: URL
  const [pageUrl, setPageUrl] = useState('')
  const [pageType, setPageType] = useState(URL_PAGE_TYPES[0])
  const [pageCopy, setPageCopy] = useState('')
  const [pageMetaTitle, setPageMetaTitle] = useState('')

  // Supporting reference files (all types)
  const [files, setFiles] = useState<string[]>([])

  // Errors & States
  const [errors, setErrors] = useState<{ title?: string; text?: string; file?: string; url?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor')
  const [dragOver, setDragOver] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  // Exception modal state
  const [exceptionOpen, setExceptionOpen] = useState(false)
  const [excReason, setExcReason] = useState('')
  const [excRule, setExcRule] = useState('BR-01')
  const [excScope, setExcScope] = useState('Campaign · single asset')
  const [excExpiry, setExcExpiry] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // Revoke object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  const activeRules = useMemo(() => rules.filter((r) => r.status === 'active'), [rules])
  const guidance = activeRules.slice(0, 3)

  // Set image file and run OCR extraction
  async function handleImageSelected(file: File | null) {
    if (!file) return
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setErrors((prev) => ({ ...prev, file: undefined }))
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
    }

    // Auto OCR & Text extraction
    setIsExtracting(true)
    setExtractionStatus(`Extracting on-image text and copy via OCR from ${file.name}...`)
    try {
      const res = await api.extractTextFromFile(file)
      if (res && res.text && res.text.trim()) {
        setImageText(res.text)
        if (!textCopy.trim() || textCopy.length < 15) {
          setTextCopy(res.text)
        }
        setExtractionStatus(`OCR detected ${res.text.length} characters in ${file.name}`)
        toast.success('Text Extracted via OCR', `Extracted: "${res.text.slice(0, 65)}..." and loaded into preview.`)
      } else {
        setExtractionStatus('Image uploaded. No high-contrast copy detected — you can type captions manually.')
      }
    } catch (err) {
      console.warn('Image extraction warning:', err)
      setExtractionStatus('Image attached for VisualGuard analysis.')
    } finally {
      setIsExtracting(false)
    }
  }

  // Set document file and run text/passage extraction
  async function handleDocSelected(file: File | null) {
    if (!file) return
    setDocFile(file)
    setErrors((prev) => ({ ...prev, file: undefined }))
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
    }

    // Auto Document & Passage extraction
    setIsExtracting(true)
    setExtractionStatus(`Extracting passages from ${file.name}...`)
    try {
      const res = await api.extractTextFromFile(file)
      if (res && res.text && res.text.trim()) {
        setDocExcerpt(res.text)
        if (!textCopy.trim() || textCopy.length < 15) {
          setTextCopy(res.text)
        }
        setExtractionStatus(`Extracted ${res.passages || 1} passages from ${file.name}`)
        toast.success('Passages Extracted', `Extracted ${res.passages || 1} passages from ${file.name} into review copy.`)
      } else {
        setExtractionStatus('Document uploaded. Key sections will be indexed for verification.')
      }
    } catch (err) {
      console.warn('Doc extraction warning:', err)
      setExtractionStatus('Document attached. Enter key claims or excerpts manually.')
    } finally {
      setIsExtracting(false)
    }
  }

  function handleGenericFiles(list: FileList | null) {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list).map((f) => f.name)].slice(0, 4))
  }

  function autofillSampleUrl() {
    setPageUrl('https://pureglow.co/campaigns/summer-radiance')
    setPageMetaTitle('PureGlow Skincare — 100% Organic Summer Radiance')
    setPageCopy(
      'This summer, experience glowing skin with our pure botanical face serum. Clinically proven 24-hour hydration with zero synthetic fragrances.',
    )
    if (!title) setTitle('Summer Radiance Campaign Page')
    setErrors({})
  }

  function validate() {
    const next: { title?: string; text?: string; file?: string; url?: string } = {}

    if (!title.trim()) {
      next.title = 'Give your content a title so reviewers can identify it.'
    } else if (title.trim().length < 3) {
      next.title = 'Use at least 3 characters.'
    }

    if (type === 'Text') {
      if (!textCopy.trim()) {
        next.text = 'Add the body copy you want reviewed.'
      } else if (textCopy.trim().length < 15) {
        next.text = 'Add at least 15 characters so the guideline check is meaningful.'
      }
    } else if (type === 'Image') {
      if (!imageFile && !selectedAssetId && !imageText.trim()) {
        next.file = 'Upload an image file or enter on-image text/captions to review.'
      }
    } else if (type === 'Document') {
      if (!docFile && !docExcerpt.trim()) {
        next.file = 'Upload a document (.pdf or .docx) or paste key text sections to review.'
      }
    } else if (type === 'URL') {
      if (!pageUrl.trim()) {
        next.url = 'Enter a webpage or landing page URL.'
      } else if (!/^https?:\/\//i.test(pageUrl.trim())) {
        next.url = 'URL must start with http:// or https://'
      }
      if (!pageCopy.trim()) {
        next.text = 'Paste the landing page text or copy to verify against brand rules.'
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    // Compile payload text based on content type
    let compiledText = ''
    if (type === 'Text') {
      compiledText = textCopy.trim()
    } else if (type === 'Image') {
      const meta = `[Format: ${imageAspectRatio} · ${imagePlacement}]`
      compiledText = imageText.trim()
        ? `${meta} ${imageText.trim()}`
        : `${meta} Image asset submitted for visual brand review: ${imageFile?.name || 'Selected Brand Asset'}`
    } else if (type === 'Document') {
      const meta = `[Document: ${docCategory} · Scope: ${docScope}]`
      compiledText = docExcerpt.trim()
        ? `${meta}\n${docExcerpt.trim()}`
        : `${meta} Attached document for brand review: ${docFile?.name || 'Uploaded document'}`
    } else if (type === 'URL') {
      const meta = `[Page Type: ${pageType}]`
      compiledText = `URL: ${pageUrl.trim()}\n${meta}\n${pageMetaTitle ? `Title: ${pageMetaTitle.trim()}\n` : ''}\n${pageCopy.trim()}`
    }

    try {
      const submission = await submitContent({
        title: title.trim(),
        type,
        channel,
        brand,
        text: compiledText,
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
      let draftText = 'Draft submitted together with an exception request.'
      if (type === 'Text' && textCopy.trim()) draftText = textCopy.trim()
      else if (type === 'Image') draftText = imageText.trim() || `Image draft: ${imageFile?.name || 'pending asset'}`
      else if (type === 'Document') draftText = docExcerpt.trim() || `Document draft: ${docFile?.name || 'pending doc'}`
      else if (type === 'URL') draftText = `URL: ${pageUrl.trim()}\n${pageCopy.trim()}`

      const submission = await submitContent({
        title: title.trim() || 'Untitled draft',
        type,
        channel,
        brand,
        text: draftText,
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

  function handleReset() {
    setTitle('')
    setTextCopy('')
    setImageFile(null)
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    setImageText('')
    setDocFile(null)
    setDocExcerpt('')
    setPageUrl('')
    setPageCopy('')
    setPageMetaTitle('')
    setFiles([])
    setErrors({})
    setSelectedAssetId(null)
  }

  return (
    <>
      <PageHeader
        title="New Content"
        subtitle="Submit your content for brand review. Precedent will check it against your brand guidelines and highlight any potential issues."
        backTo="/app/overview"
        backLabel="Back to Dashboard"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_288px]">
        <form onSubmit={onSubmit} className="min-w-0 space-y-4">
          {/* Upper Header: Content Type Selector Tabs */}
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {TYPES.map((t) => {
              const active = t.key === type
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setType(t.key)
                    setErrors({})
                  }}
                  aria-pressed={active}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl border bg-white p-3 text-left transition-all',
                    active
                      ? 'border-brand-500 bg-brand-50/60 shadow-[0_0_0_3px_rgba(47,111,237,.12)]'
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

          {/* Mobile view switcher */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-[#FAF7EF] p-1 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileTab('editor')}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-semibold transition',
                mobileTab === 'editor' ? 'bg-white text-ink shadow-xs border border-line' : 'text-muted hover:text-ink'
              )}
            >
              1. Content Form
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-semibold transition flex items-center justify-center gap-1.5',
                mobileTab === 'preview' ? 'bg-white text-ink shadow-xs border border-line' : 'text-muted hover:text-ink'
              )}
            >
              <span>2. Live Preview</span>
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
            </button>
          </div>

          {/* Extraction status notification */}
          {(isExtracting || extractionStatus) && (
            <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/70 px-3.5 py-2.5 text-xs text-brand-800 animate-fade-in">
              <div className="flex items-center gap-2">
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0" />
                )}
                <span className="font-medium">{extractionStatus}</span>
              </div>
              {!isExtracting && (
                <button
                  type="button"
                  onClick={() => setExtractionStatus(null)}
                  className="rounded p-1 text-brand-600 hover:bg-brand-100 hover:text-brand-900"
                  aria-label="Dismiss message"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Form details card */}
            <div className={cn(mobileTab === 'preview' ? 'hidden lg:block' : 'block')}>
            <Card className="card-pad">
              <div className="mb-3.5 flex items-center justify-between border-b border-line pb-2.5">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Content Details</h2>
                  <p className="text-2xs text-muted">
                    {type === 'Text' && 'Draft and verify ad copy, captions, or campaign body text.'}
                    {type === 'Image' && 'Upload creative posters, banners, and verify on-image text and aspect ratios.'}
                    {type === 'Document' && 'Upload brand decks, packaging PDFs, and style guide excerpts.'}
                    {type === 'URL' && 'Validate landing page links, product copy, and web campaign claims.'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-2xs font-semibold text-brand-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {type} Mode
                </span>
              </div>

              {/* 1. Common Fields (Always visible for all types) */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Content Title" required error={errors.title} htmlFor="title">
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        setErrors((p) => ({ ...p, title: undefined }))
                      }}
                      placeholder={
                        type === 'Text'
                          ? 'e.g. Summer Festival Instagram Copy'
                          : type === 'Image'
                            ? 'e.g. Summer Glow Poster 1080x1080'
                            : type === 'Document'
                              ? 'e.g. 2026 Product Claims & Label Guide'
                              : 'e.g. Summer Sale Promo Landing Page'
                      }
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Brand" htmlFor="brand">
                    <Select id="brand" value={brand} onChange={(e) => setBrand(e.target.value as Brand)}>
                      <option value="PureGlow">PureGlow</option>
                      <option value="WellnessLife">WellnessLife</option>
                    </Select>
                  </Field>

                  {/* Contextual sub-option pill based on type */}
                  {type === 'Text' && (
                    <Field label="Copy Format" htmlFor="text-format">
                      <Select id="text-format" value={textFormat} onChange={(e) => setTextFormat(e.target.value)}>
                        {TEXT_FORMATS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}

                  {type === 'Image' && (
                    <Field label="Aspect Ratio" htmlFor="image-aspect">
                      <Select id="image-aspect" value={imageAspectRatio} onChange={(e) => setImageAspectRatio(e.target.value)}>
                        {IMAGE_ASPECT_RATIOS.map((ar) => (
                          <option key={ar} value={ar}>
                            {ar}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}

                  {type === 'Document' && (
                    <Field label="Document Category" htmlFor="doc-cat">
                      <Select id="doc-cat" value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                        {DOC_CATEGORIES.map((dc) => (
                          <option key={dc} value={dc}>
                            {dc}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}

                  {type === 'URL' && (
                    <Field label="Page Type" htmlFor="url-type">
                      <Select id="url-type" value={pageType} onChange={(e) => setPageType(e.target.value)}>
                        {URL_PAGE_TYPES.map((pt) => (
                          <option key={pt} value={pt}>
                            {pt}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </div>
              </div>

              {/* 2. SPECIFIC SECTION: Changes dynamically based on selected tab */}
              <div className="mt-4 border-t border-line pt-4">
                {/* -------------------- TAB 1: TEXT CONTENT (DEFAULT) -------------------- */}
                {type === 'Text' && (
                  <div className="space-y-3">
                    <Field
                      label="Body Copy / Content Text"
                      required
                      error={errors.text}
                      htmlFor="text-copy"
                      counter={
                        <span
                          className={cn(
                            'text-2xs font-medium tabular-nums',
                            textCopy.length > MAX_CHARS
                              ? 'text-danger-600'
                              : textCopy.length > MAX_CHARS * 0.85
                                ? 'text-warn-600'
                                : 'text-muted-light',
                          )}
                        >
                          {textCopy.length}/{MAX_CHARS}
                        </span>
                      }
                    >
                      <Textarea
                        id="text-copy"
                        rows={6}
                        value={textCopy}
                        maxLength={MAX_CHARS}
                        onChange={(e) => {
                          setTextCopy(e.target.value)
                          setErrors((p) => ({ ...p, text: undefined }))
                        }}
                        placeholder="This summer, enjoy up to 50% off on our organic skincare products. Pure. Natural. Real results!"
                        invalid={Boolean(errors.text)}
                      />
                    </Field>
                    <p className="text-2xs text-muted-light">
                      The deterministic rule engine checks this text against active brand rules, prohibited phrases, and claim restrictions.
                    </p>

                    {/* Optional reference attachments */}
                    <div className="pt-2">
                      <p className="mb-1 text-xs font-semibold text-ink-700">
                        Attach Reference Files <span className="font-normal text-muted">(optional)</span>
                      </p>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOver(true)
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOver(false)
                          handleGenericFiles(e.dataTransfer.files)
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-3.5 text-center transition-colors',
                          dragOver ? 'border-brand-400 bg-brand-50/60' : 'border-line-strong bg-[#FBFDFF] hover:border-brand-200',
                        )}
                      >
                        <Upload className="mb-1 h-3.5 w-3.5 text-muted" />
                        <p className="text-xs font-medium text-ink-600">Drag & drop briefs or guidelines (max 10MB)</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleGenericFiles(e.target.files)}
                          accept=".pdf,.docx,.jpg,.jpeg,.png"
                        />
                      </div>
                      {files.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {files.map((f) => (
                            <li key={f} className="flex items-center gap-2 rounded-md bg-[#F7FAFE] px-2 py-1 text-2xs text-ink-600">
                              <Paperclip className="h-3 w-3 text-muted" />
                              <span className="min-w-0 flex-1 truncate">{f}</span>
                              <button
                                type="button"
                                onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                                className="text-muted hover:text-danger-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* -------------------- TAB 2: IMAGE -------------------- */}
                {type === 'Image' && (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-xs font-semibold text-ink-700">
                          Upload Brand Image / Poster <span className="text-danger-500">*</span>
                        </label>
                        <span className="text-2xs text-muted">Supports PNG, JPG, WEBP, SVG</span>
                      </div>

                      {imagePreviewUrl ? (
                        <div className="relative flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
                          <img
                            src={imagePreviewUrl}
                            alt="Uploaded preview"
                            className="h-16 w-16 rounded-lg border border-line object-cover shadow-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ink">{imageFile?.name}</p>
                            <p className="mt-0.5 text-2xs text-muted">
                              {imageFile ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Brand Asset'} · Aspect:{' '}
                              {imageAspectRatio}
                            </p>
                            <span className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-brand-600">
                              <CheckCircle2 className="h-3 w-3" /> Ready for visual inspection
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
                              setImageFile(null)
                              setImagePreviewUrl(null)
                            }}
                            className="text-danger-600 hover:bg-danger-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault()
                            setDragOver(true)
                          }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragOver(false)
                            if (e.dataTransfer.files?.[0]) handleImageSelected(e.dataTransfer.files[0])
                          }}
                          onClick={() => imageInputRef.current?.click()}
                          className={cn(
                            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all',
                            dragOver ? 'border-brand-500 bg-brand-50/80' : 'border-line-strong bg-[#FAFBFD] hover:border-brand-300',
                            errors.file && 'border-danger-400 bg-danger-50/30',
                          )}
                        >
                          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                            <ImageIcon className="h-5 w-5" />
                          </span>
                          <p className="text-xs font-semibold text-ink-700">Drag & drop your visual asset, or click to browse</p>
                          <p className="mt-0.5 text-2xs text-muted">Recommended: 1080×1080 (1:1) or 1920×1080 (16:9), up to 25MB</p>
                          <input
                            ref={imageInputRef}
                            type="file"
                            className="hidden"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleImageSelected(e.target.files[0])
                            }}
                          />
                        </div>
                      )}
                      {errors.file && <p className="mt-1 text-2xs text-danger-600">{errors.file}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Creative Placement" htmlFor="image-placement">
                        <Select
                          id="image-placement"
                          value={imagePlacement}
                          onChange={(e) => setImagePlacement(e.target.value)}
                        >
                          {IMAGE_PLACEMENTS.map((ip) => (
                            <option key={ip} value={ip}>
                              {ip}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <div className="flex flex-col justify-end">
                        <div className="rounded-lg border border-line bg-[#F8FAFC] p-2 text-2xs text-muted">
                          <span className="font-semibold text-ink-700">VisualGuard:</span> Checks CIE-Lab ΔE76 color distance,
                          WCAG AA contrast, and clear space around logos.
                        </div>
                      </div>
                    </div>

                    <Field
                      label="On-Image Text & Taglines (for OCR & Claim Verification)"
                      htmlFor="image-text"
                      counter={<span className="text-2xs text-muted-light">{imageText.length}/500</span>}
                    >
                      <Textarea
                        id="image-text"
                        rows={3}
                        value={imageText}
                        maxLength={500}
                        onChange={(e) => setImageText(e.target.value)}
                        placeholder="e.g. PureGlow 100% Organic Radiance Serum. Up to 50% Off this weekend only."
                      />
                    </Field>
                  </div>
                )}

                {/* -------------------- TAB 3: DOCUMENT (PDF / DOCX) -------------------- */}
                {type === 'Document' && (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-xs font-semibold text-ink-700">
                          Upload Document File <span className="text-danger-500">*</span>
                        </label>
                        <span className="text-2xs text-muted">PDF or DOCX (max 25MB)</span>
                      </div>

                      {docFile ? (
                        <div className="relative flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-xs uppercase shadow-sm">
                            {docFile.name.endsWith('.pdf') ? 'PDF' : 'DOCX'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ink">{docFile.name}</p>
                            <p className="mt-0.5 text-2xs text-muted">
                              {(docFile.size / (1024 * 1024)).toFixed(2)} MB · {docCategory}
                            </p>
                            <span className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-brand-600">
                              <CheckCircle2 className="h-3 w-3" /> Ready for passage extraction & citation audit
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDocFile(null)}
                            className="text-danger-600 hover:bg-danger-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault()
                            setDragOver(true)
                          }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragOver(false)
                            if (e.dataTransfer.files?.[0]) handleDocSelected(e.dataTransfer.files[0])
                          }}
                          onClick={() => docInputRef.current?.click()}
                          className={cn(
                            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all',
                            dragOver ? 'border-brand-500 bg-brand-50/80' : 'border-line-strong bg-[#FAFBFD] hover:border-brand-300',
                            errors.file && 'border-danger-400 bg-danger-50/30',
                          )}
                        >
                          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                            <FileType className="h-5 w-5" />
                          </span>
                          <p className="text-xs font-semibold text-ink-700">Drag & drop your PDF or DOCX file</p>
                          <p className="mt-0.5 text-2xs text-muted">Precedent extracts passages and indexes them for evidence tracking</p>
                          <input
                            ref={docInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.docx,.doc"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleDocSelected(e.target.files[0])
                            }}
                          />
                        </div>
                      )}
                      {errors.file && <p className="mt-1 text-2xs text-danger-600">{errors.file}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Review Scope / Target Pages" htmlFor="doc-scope">
                        <Input
                          id="doc-scope"
                          value={docScope}
                          onChange={(e) => setDocScope(e.target.value)}
                          placeholder="e.g. Pages 1-5 or Section 3: Claims"
                        />
                      </Field>
                      <div className="flex flex-col justify-end">
                        <p className="rounded-lg border border-line bg-[#F8FAFC] p-2 text-2xs text-muted">
                          <span className="font-semibold text-ink-700">Evidence Intelligence:</span> Matches passages to verified
                          claims and flags unsupported marketing assertions.
                        </p>
                      </div>
                    </div>

                    <Field
                      label="Key Excerpt / Important Claims to Audit"
                      htmlFor="doc-excerpt"
                      counter={<span className="text-2xs text-muted-light">{docExcerpt.length}/800</span>}
                    >
                      <Textarea
                        id="doc-excerpt"
                        rows={4}
                        value={docExcerpt}
                        maxLength={800}
                        onChange={(e) => setDocExcerpt(e.target.value)}
                        placeholder="Paste specific paragraphs, ingredient claims, or guarantee statements from this document for immediate deterministic checks..."
                      />
                    </Field>
                  </div>
                )}

                {/* -------------------- TAB 4: URL (LANDING PAGE / WEB) -------------------- */}
                {type === 'URL' && (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-semibold text-ink-700" htmlFor="page-url">
                          Page Web URL <span className="text-danger-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={autofillSampleUrl}
                          className="text-2xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          Autofill Demo URL
                        </button>
                      </div>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                          <Globe className="h-4 w-4" />
                        </span>
                        <Input
                          id="page-url"
                          type="url"
                          value={pageUrl}
                          onChange={(e) => {
                            setPageUrl(e.target.value)
                            setErrors((p) => ({ ...p, url: undefined }))
                          }}
                          placeholder="https://pureglow.co/campaigns/summer-collection"
                          className="pl-9"
                          invalid={Boolean(errors.url)}
                        />
                      </div>
                      {errors.url && <p className="mt-1 text-2xs text-danger-600">{errors.url}</p>}
                    </div>

                    <Field label="Page Meta Title (Optional)" htmlFor="page-meta">
                      <Input
                        id="page-meta"
                        value={pageMetaTitle}
                        onChange={(e) => setPageMetaTitle(e.target.value)}
                        placeholder="e.g. PureGlow Skincare — 100% Organic Botanical Face Serum"
                      />
                    </Field>

                    <Field
                      label="Landing Page Copy / Key Claims to Verify"
                      required
                      error={errors.text}
                      htmlFor="page-copy"
                      counter={<span className="text-2xs text-muted-light">{pageCopy.length}/800</span>}
                    >
                      <Textarea
                        id="page-copy"
                        rows={5}
                        value={pageCopy}
                        maxLength={800}
                        onChange={(e) => {
                          setPageCopy(e.target.value)
                          setErrors((p) => ({ ...p, text: undefined }))
                        }}
                        placeholder="Paste the landing page headline, promo copy, ingredient claims, or terms shown on this webpage..."
                        invalid={Boolean(errors.text)}
                      />
                    </Field>
                    <p className="text-2xs text-muted-light">
                      Checks live web copy against the Approved Claims register and prohibited marketing terminology.
                    </p>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleReset}>
                  Clear
                </Button>
                <Button type="submit" loading={submitting} className="w-full sm:w-auto" icon={<Send className="h-3.5 w-3.5" />}>
                  Submit for Review
                </Button>
              </div>
            </Card>
            </div>

            {/* Dynamic Content Preview Card */}
            <div className={cn(mobileTab === 'editor' ? 'hidden lg:block' : 'block', 'space-y-4')}>
              <Card className="overflow-hidden shadow-sm">
                <CardHeader title="Content Preview" dense />
                <div className="p-3">
                  <DynamicPreviewCard
                    type={type}
                    title={title}
                    brand={brand}
                    channel={channel}
                    textCopy={textCopy}
                    textFormat={textFormat}
                    imagePreviewUrl={imagePreviewUrl}
                    imageFile={imageFile}
                    imageAspectRatio={imageAspectRatio}
                    imageText={imageText}
                    docFile={docFile}
                    docCategory={docCategory}
                    docScope={docScope}
                    docExcerpt={docExcerpt}
                    pageUrl={pageUrl}
                    pageType={pageType}
                    pageCopy={pageCopy}
                  />
                  <p className="mt-2.5 flex items-center gap-1 text-2xs text-muted-light">
                    <Info className="h-3 w-3 shrink-0" />
                    <span>Real-time preview adapts to the selected content format.</span>
                  </p>
                </div>
              </Card>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5">
            <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-brand-500" />
            <p className="text-xs leading-[17px] text-brand-700/90">
              Your content will be checked automatically against the active rule set. You’ll see any issues, suggested minimal
              changes, and the exact guideline section used for the review.
            </p>
          </div>
        </form>

        {/* Right Rail: Brand Assets Picker, Guidelines, Tips, Exception */}
        <div className="space-y-4">
          <BrandAssetsPicker brand={brand} selectedId={selectedAssetId} onSelect={setSelectedAssetId} />

          <Card>
            <CardHeader
              title="Brand Guidelines"
              action={
                <button onClick={() => navigate('/app/guidelines')} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  View all
                </button>
              }
              dense
            />
            <ul className="divide-line">
              {loading && <li className="px-4 py-3 text-xs text-muted">Loading rules…</li>}
              {!loading && guidance.length === 0 && <li className="px-4 py-3 text-xs text-muted">No active rules yet.</li>}
              {guidance.map((r) => (
                <li key={r.id} className="px-4 py-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
                    <CheckCircle2 className="h-3 w-3 text-success-500" />
                    {r.title}
                  </p>
                  <p className="mt-0.5 pl-[18px] text-2xs leading-[14px] text-muted">
                    {r.code} · {r.sourceVersion} · {r.scope}
                  </p>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5">
              <p className="flex items-start gap-1.5 text-2xs leading-[15px] text-muted">
                <Info className="mt-[1px] h-3 w-3 shrink-0 text-brand-400" />
                {brand === 'PureGlow'
                  ? 'PureGlow enforces strict organic claims & green primary tone.'
                  : 'WellnessLife requires clinical disclaimers on health claims.'}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-md font-semibold text-ink">
              <Lightbulb className="h-3.5 w-3.5 text-warn-500" />
              Quick Tips
            </h2>
            <ul className="space-y-1.5">
              {[
                'Use approved brand colours and official logo files.',
                'Avoid absolute claims (e.g. “100% cure”, “instantly fixes”).',
                'Ensure sufficient contrast on image overlays (WCAG AA).',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-1.5 text-xs leading-[16px] text-ink-600">
                  <CheckCircle2 className="mt-[2px] h-3 w-3 shrink-0 text-success-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="mb-1 flex items-center gap-1.5 text-md font-semibold text-ink">
              <ShieldAlert className="h-3.5 w-3.5 text-grape-500" />
              Need an Exception?
            </h2>
            <p className="mb-2.5 text-xs leading-[16px] text-muted">
              If your campaign requires content outside standard brand rules, request an exception. A brand manager must approve it.
            </p>
            <Button variant="outline" block size="sm" onClick={() => setExceptionOpen(true)}>
              Request Exception
            </Button>
          </Card>
        </div>
      </div>

      {/* Exception Request Modal */}
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
              An exception is not an approval. The content still goes through review, and the exception only applies to the
              scope and dates recorded here.
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
              placeholder="e.g. Seasonal holiday campaign requires gold accent foil outside standard green palette."
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
/* Dynamic Preview Card Component                                     */
/* ------------------------------------------------------------------ */

interface DynamicPreviewProps {
  type: ContentType
  title: string
  brand: Brand
  channel: string
  textCopy: string
  textFormat: string
  imagePreviewUrl: string | null
  imageFile: File | null
  imageAspectRatio: string
  imageText: string
  docFile: File | null
  docCategory: string
  docScope: string
  docExcerpt: string
  pageUrl: string
  pageType: string
  pageCopy: string
}

function DynamicPreviewCard({
  type,
  title,
  brand,
  channel,
  textCopy,
  textFormat,
  imagePreviewUrl,
  imageFile,
  imageAspectRatio,
  imageText,
  docFile,
  docCategory,
  docScope,
  docExcerpt,
  pageUrl,
  pageType,
  pageCopy,
}: DynamicPreviewProps) {
  // 1. TEXT PREVIEW
  if (type === 'Text') {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-[#FAF7EF] shadow-sm">
        <div className="relative flex min-h-[160px] flex-col justify-between bg-gradient-to-br from-[#E8F5C8] via-[#D7EFB0] to-[#B9DE7E] p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2C4A1E]/80">{brand}</p>
              <p className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-[#2C4A1E]/60">{textFormat}</p>
            </div>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[8.5px] font-semibold text-[#2C4A1E]">
              {channel}
            </span>
          </div>
          <div className="my-2">
            <p className="text-[14px] font-bold leading-[18px] text-[#1F3D12]">{title || 'Your campaign title'}</p>
            <p className="mt-1.5 line-clamp-4 text-[10px] leading-[15px] text-[#2C4A1E]/85">
              {textCopy || 'Your content copy will preview here as you type...'}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-[#2C4A1E]/15 pt-1.5 text-[8.5px] text-[#2C4A1E]/70">
            <span>{textCopy ? `${textCopy.length} characters` : 'Draft Copy'}</span>
            <span>Deterministic Check Active</span>
          </div>
        </div>
      </div>
    )
  }

  // 2. IMAGE PREVIEW
  if (type === 'Image') {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="relative aspect-square w-full overflow-hidden bg-[#1E2922]">
          {imagePreviewUrl ? (
            <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white/70">
              <ImageIcon className="mb-2 h-8 w-8 text-white/40" />
              <p className="text-xs font-semibold text-white/90">Image Preview</p>
              <p className="mt-0.5 text-2xs text-white/50">{imageAspectRatio} · Frame</p>
            </div>
          )}

          {/* Top badges */}
          <div className="absolute left-2.5 right-2.5 top-2.5 flex items-center justify-between">
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              {brand}
            </span>
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[8.5px] font-semibold text-ink">
              {channel}
            </span>
          </div>

          {/* Bottom text overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 pt-6 text-white">
            <p className="text-xs font-bold leading-tight">{title || 'Image Title'}</p>
            {imageText && <p className="mt-1 line-clamp-2 text-[10px] text-white/80">{imageText}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between bg-[#F8FAFC] px-3 py-1.5 text-2xs text-muted">
          <span>{imageAspectRatio}</span>
          <span>{imageFile ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Awaiting image'}</span>
        </div>
      </div>
    )
  }

  // 3. DOCUMENT PREVIEW
  if (type === 'Document') {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="border-b border-line bg-[#FAF7EF] p-3">
          <div className="flex items-start justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase">
              <FileType className="h-3 w-3" />
              {docFile?.name?.endsWith('.docx') ? 'DOCX' : 'PDF'}
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[8.5px] font-semibold text-ink border border-line">
              {channel}
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-ink">{title || 'Document Title'}</p>
          <p className="mt-0.5 text-2xs text-muted">{docCategory}</p>
        </div>

        <div className="p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-light">Excerpt / Key Claims</p>
          <p className="mt-1 line-clamp-4 rounded bg-[#F8FAFC] p-2 text-[10px] leading-[14px] text-ink-700 italic border border-line/60">
            {docExcerpt || 'No excerpt pasted. The full document will be parsed during review.'}
          </p>
          <div className="mt-2.5 flex items-center justify-between text-2xs text-muted">
            <span>Scope: {docScope}</span>
            <span>{docFile ? docFile.name.slice(-18) : 'Pending file'}</span>
          </div>
        </div>
      </div>
    )
  }

  // 4. URL PREVIEW (Browser frame)
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      {/* Mock browser header */}
      <div className="flex items-center gap-2 border-b border-line bg-[#F1F5F9] px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
          <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
          <span className="h-2 w-2 rounded-full bg-[#10B981]" />
        </div>
        <div className="flex flex-1 items-center gap-1 rounded bg-white px-2 py-0.5 text-[9px] text-muted border border-line/80 truncate">
          <Globe className="h-2.5 w-2.5 shrink-0 text-brand-600" />
          <span className="truncate">{pageUrl || 'https://pureglow.co/...'}</span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between text-2xs text-muted mb-1.5">
          <span className="font-semibold text-brand-700">{brand}</span>
          <span className="rounded bg-brand-50 px-1.5 py-0.2 text-[8px] font-semibold text-brand-700 border border-brand-200">
            {pageType}
          </span>
        </div>
        <p className="text-xs font-bold text-ink">{title || 'Web Page Title'}</p>
        <p className="mt-1.5 line-clamp-4 rounded bg-[#FAFBFD] p-2 text-[10px] leading-[14px] text-ink-800 border border-line/60">
          {pageCopy || 'Webpage content and promo claims will preview here...'}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-line bg-[#F8FAFC] px-3 py-1.5 text-2xs text-muted">
        <span className="flex items-center gap-1">
          <ExternalLink className="h-2.5 w-2.5" />
          {pageUrl ? new URL(pageUrl.startsWith('http') ? pageUrl : `https://${pageUrl}`).hostname : 'pureglow.co'}
        </span>
        <span className="text-success-600 font-medium">Link Active</span>
      </div>
    </div>
  )
}
