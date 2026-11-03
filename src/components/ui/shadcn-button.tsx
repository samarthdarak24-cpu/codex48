import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * shadcn-style button primitive.
 *
 * NOTE: this file must not be named `button.tsx` — the legacy design-system
 * `Button.tsx` lives in the same folder and Windows/macOS filesystems are
 * case-insensitive, so `button.tsx` silently overwrites it.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 hover:shadow-md',
        sage:
          'bg-sage-500 text-white shadow-sm hover:bg-sage-600 active:bg-sage-700',
        terracotta:
          'bg-terracotta-500 text-white shadow-sm hover:bg-terracotta-600 active:bg-terracotta-700',
        danger:
          'bg-danger-500 text-white shadow-sm hover:bg-danger-600 active:bg-danger-700',
        outline:
          'border border-line bg-white hover:bg-cream-50 hover:border-brand-300 text-ink',
        ghost:
          'hover:bg-cream-100 hover:text-ink text-muted',
        link:
          'text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-2xs',
        lg: 'h-10 px-5 text-sm',
        xl: 'h-11 px-6 text-sm',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
