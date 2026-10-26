import { useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Campaign-asset artwork used across the marketing page.
 *
 * Each card represents real brand campaign creative carrying its review status,
 * product imagery, typography and evidence citations.
 */

export interface AssetVariant {
  id: string
  brand: string
  headline: string
  kicker?: string
  from: string
  to: string
  ink: string
  accent: string
  status: 'Approved' | 'Needs review' | 'Exception' | 'Pending' | 'In review'
  type: string
  glyph?: 'circle' | 'blob' | 'rings' | 'arc' | 'none'
  imageUrl?: string
  category?: 'skincare' | 'wellness' | 'cosmetics' | 'lifestyle'
  ruleCode?: string
}

export const ASSETS: AssetVariant[] = [
  {
    id: 'summer',
    brand: 'PureGlow',
    kicker: 'Skincare',
    headline: 'This summer,\n50% off',
    from: '#EAF6C9',
    to: '#B9DE7E',
    ink: '#1F3D12',
    accent: '#5C8A2E',
    status: 'Needs review',
    type: 'Social',
    glyph: 'blob',
    imageUrl: '/images/assets/summer.jpg',
    category: 'skincare',
    ruleCode: 'BR-01',
  },
  {
    id: 'ingredients',
    brand: 'PureGlow',
    kicker: 'Botanicals',
    headline: 'Real ingredients.\nReal results.',
    from: '#E9DEFB',
    to: '#B79BEA',
    ink: '#2E1B4D',
    accent: '#6B46B8',
    status: 'Approved',
    type: 'Instagram',
    glyph: 'rings',
    imageUrl: '/images/assets/ingredients.jpg',
    category: 'skincare',
    ruleCode: 'CL-04',
  },
  {
    id: 'festival',
    brand: 'PureGlow',
    kicker: 'Limited',
    headline: 'Festival\nSpecial',
    from: '#FFE3CC',
    to: '#F5A97F',
    ink: '#4A2210',
    accent: '#C4612F',
    status: 'Exception',
    type: 'Email',
    glyph: 'arc',
    imageUrl: '/images/assets/festival.jpg',
    category: 'cosmetics',
    ruleCode: 'EX-12',
  },
  {
    id: 'wellness',
    brand: 'WellnessLife',
    kicker: 'Organic',
    headline: 'Feel good.\nNaturally.',
    from: '#D9F3E4',
    to: '#7FC79B',
    ink: '#123B2A',
    accent: '#2C7A55',
    status: 'Approved',
    type: 'Email',
    glyph: 'circle',
    imageUrl: '/images/assets/wellness.jpg',
    category: 'wellness',
    ruleCode: 'WL-02',
  },
  {
    id: 'sensitive',
    brand: 'PureGlow',
    kicker: 'Product',
    headline: 'Gentle care for\nsensitive skin',
    from: '#DEEBFB',
    to: '#8FB8EE',
    ink: '#10294A',
    accent: '#2F5F9E',
    status: 'Approved',
    type: 'Website',
    glyph: 'blob',
    imageUrl: '/images/assets/sensitive.jpg',
    category: 'skincare',
    ruleCode: 'CL-01',
  },
  {
    id: 'holiday',
    brand: 'PureGlow',
    kicker: 'Gifting',
    headline: 'Gift sets,\nwrapped',
    from: '#F7EED8',
    to: '#DCC49A',
    ink: '#3B2E14',
    accent: '#8A6B2E',
    status: 'Pending',
    type: 'Social',
    glyph: 'rings',
    imageUrl: '/images/assets/holiday.jpg',
    category: 'lifestyle',
    ruleCode: 'PK-08',
  },
  {
    id: 'awareness',
    brand: 'PureGlow',
    kicker: 'Editorial',
    headline: 'Brand\nawareness',
    from: '#FBDFE5',
    to: '#EF9FB0',
    ink: '#4A1521',
    accent: '#B03A52',
    status: 'Approved',
    type: 'Instagram',
    glyph: 'arc',
    imageUrl: '/images/assets/awareness.jpg',
    category: 'cosmetics',
    ruleCode: 'IM-03',
  },
  {
    id: 'partner',
    brand: 'WellnessLife',
    kicker: 'Paid partnership',
    headline: 'Morning\nritual',
    from: '#E0E3FA',
    to: '#8E97DE',
    ink: '#1B2149',
    accent: '#454EA8',
    status: 'In review',
    type: 'Video',
    glyph: 'circle',
    imageUrl: '/images/assets/partner.jpg',
    category: 'wellness',
    ruleCode: 'VD-05',
  },
]

const statusTone: Record<AssetVariant['status'], string> = {
  Approved: 'bg-white/95 text-[#0A7F5A] border-emerald-200/60 shadow-emerald-500/10',
  'Needs review': 'bg-white/95 text-[#A96A0C] border-amber-200/60 shadow-amber-500/10',
  Exception: 'bg-white/95 text-[#5F32BE] border-purple-200/60 shadow-purple-500/10',
  Pending: 'bg-white/95 text-[#A96A0C] border-amber-200/60 shadow-amber-500/10',
  'In review': 'bg-white/95 text-[#1B49AE] border-blue-200/60 shadow-blue-500/10',
}

const dotTone: Record<AssetVariant['status'], string> = {
  Approved: 'bg-[#10B981]',
  'Needs review': 'bg-[#F0A32A]',
  Exception: 'bg-[#8B5CF6]',
  Pending: 'bg-[#F0A32A]',
  'In review': 'bg-[#2F6FED]',
}

function Glyph({ kind, color }: { kind: AssetVariant['glyph']; color: string }) {
  if (!kind || kind === 'none') return null
  if (kind === 'circle') {
    return <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20" style={{ background: color }} />
  }
  if (kind === 'blob') {
    return (
      <span
        className="pointer-events-none absolute -bottom-10 -right-8 h-36 w-36 opacity-[0.18]"
        style={{ background: color, borderRadius: '48% 52% 38% 62% / 55% 42% 58% 45%' }}
      />
    )
  }
  if (kind === 'rings') {
    return (
      <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-[0.16]">
        <span className="absolute inset-0 rounded-full border-[10px]" style={{ borderColor: color }} />
        <span className="absolute inset-6 rounded-full border-[6px]" style={{ borderColor: color }} />
      </span>
    )
  }
  return (
    <span
      className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 opacity-[0.16]"
      style={{ background: color, borderRadius: '50% 50% 0 0' }}
    />
  )
}

export function AssetCard({
  variant,
  className,
  size = 'md',
  showMeta = true,
}: {
  variant: AssetVariant
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showMeta?: boolean
}) {
  const [imgLoaded, setImgLoaded] = useState(false)

  const headlineSize =
    size === 'lg'
      ? 'text-[22px] sm:text-[25px] leading-[1.08]'
      : size === 'sm'
        ? 'text-[13px] sm:text-[14px] leading-[1.12]'
        : 'text-[16px] sm:text-[18px] leading-[1.1]'

  const pad = size === 'lg' ? 'p-4 sm:p-5' : size === 'sm' ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'

  return (
    <div
      className={cn(
        'group relative flex h-full w-full flex-col justify-between overflow-hidden transition-all duration-500 ease-out',
        pad,
        className,
      )}
      style={{ background: `linear-gradient(150deg, ${variant.from} 0%, ${variant.to} 100%)` }}
    >
      <Glyph kind={variant.glyph} color={variant.accent} />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: variant.accent }}>
            {variant.brand}
          </p>
          {variant.kicker && (
            <p className="mt-[1px] truncate text-[8px] font-semibold uppercase tracking-[0.14em] opacity-60" style={{ color: variant.ink }}>
              {variant.kicker}
            </p>
          )}
        </div>

        <span
          className="shrink-0 rounded-full border border-white/40 bg-white/60 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] shadow-2xs backdrop-blur-md"
          style={{ color: variant.ink }}
        >
          {variant.type}
        </span>
      </div>

      {/* Center Image Container — fills up the empty space with editorial campaign photography */}
      {variant.imageUrl && (
        <div
          className={cn(
            'relative my-2 w-full flex-1 min-h-[90px] overflow-hidden rounded-xl border border-white/40 bg-white/20 shadow-sm transition-all duration-500 group-hover:shadow-md',
            size === 'lg' && 'my-3 min-h-[160px] rounded-2xl',
            size === 'sm' && 'my-1.5 min-h-[65px] rounded-lg',
          )}
        >
          {/* Skeleton placeholder while loading */}
          {!imgLoaded && (
            <div className="absolute inset-0 animate-pulse bg-white/30 backdrop-blur-xs" />
          )}

          <img
            src={variant.imageUrl}
            alt={variant.headline.replace('\n', ' ')}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108',
              imgLoaded ? 'opacity-100' : 'opacity-0',
            )}
          />

          {/* Gradient overlay for soft lighting */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-20" />

          {/* Specular sheen effect on hover */}
          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-full" />

          {/* Rule citation badge on hover */}
          {variant.ruleCode && (
            <div className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[8px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
              <CheckCircle2 className="h-2.5 w-2.5 text-[#B9DE7E]" />
              <span>{variant.ruleCode}</span>
            </div>
          )}
        </div>
      )}

      {/* Headline */}
      <p
        className={cn('relative z-10 whitespace-pre-line font-display tracking-tight transition-transform duration-300 group-hover:translate-x-0.5', headlineSize)}
        style={{ color: variant.ink }}
      >
        {variant.headline}
      </p>

      {/* Meta: Status indicator */}
      {showMeta && (
        <div className="relative z-10 mt-2 flex items-center justify-between gap-1.5 border-t border-black/5 pt-2">
          <span className="flex items-center gap-1 text-[8.5px] font-medium uppercase tracking-[0.08em] opacity-60" style={{ color: variant.ink }}>
            <Sparkles className="h-2.5 w-2.5 opacity-70" />
            Asset Review
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-[2.5px] text-[8.5px] font-bold shadow-xs transition-transform duration-300 group-hover:scale-105',
              statusTone[variant.status],
            )}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', dotTone[variant.status])} />
              <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', dotTone[variant.status])} />
            </span>
            {variant.status}
          </span>
        </div>
      )}
    </div>
  )
}
