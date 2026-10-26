import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'outline' | 'ghost' | 'subtle' | 'danger' | 'success'
type Size = 'xs' | 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white shadow-[0_1px_2px_rgba(15,33,56,.10)] hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300',
  outline:
    'border border-line-strong bg-white text-ink hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-700 active:bg-brand-50',
  ghost: 'text-ink-600 hover:bg-[#F1F6FD] hover:text-ink',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700',
  success: 'bg-success-500 text-white hover:bg-success-600',
}

const sizes: Record<Size, string> = {
  xs: 'h-7 gap-1 rounded-md px-2 text-xs',
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-sm',
  md: 'h-[34px] gap-1.5 rounded-lg px-3.5 text-base',
  lg: 'h-10 gap-2 rounded-lg px-4 text-md',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, icon, iconRight, block, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-150',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
})

export function IconButton({
  className,
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors',
        'hover:bg-[#F1F6FD] hover:text-ink focus-visible:bg-[#F1F6FD]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
