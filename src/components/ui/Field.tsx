import { forwardRef, useId } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Labeled field wrapper                                               */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
  counter,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
  counter?: React.ReactNode
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-semibold text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
        {counter}
      </div>
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return <input ref={ref} className={cn('field', invalid && 'field-error', className)} {...props} />
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return <textarea ref={ref} className={cn('field resize-none leading-[21px]', invalid && 'field-error', className)} {...props} />
})

export function Select({
  className,
  children,
  invalid,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        className={cn('field appearance-none pr-8', invalid && 'field-error', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  id,
  onClear,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  id?: string
  onClear?: () => void
}) {
  const autoId = useId()
  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" />
      <input
        id={id ?? autoId}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field h-[34px] pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            onClear?.()
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-[#E8EEF7] text-ink-600 transition-colors hover:bg-[#DCE5F2]"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Checkbox                                                            */
/* ------------------------------------------------------------------ */

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  className,
  id,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: React.ReactNode
  description?: React.ReactNode
  className?: string
  id?: string
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[2px] h-3.5 w-3.5 shrink-0 cursor-pointer rounded-[4px] border-line-strong"
      />
      <label htmlFor={inputId} className="cursor-pointer select-none">
        <span className="block text-base leading-[19px] text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-[16px] text-muted">{description}</span>}
      </label>
    </div>
  )
}
