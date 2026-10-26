import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Scroll-triggered reveal. Elements start hidden and fade up once, then the
 * observer disconnects. Respects prefers-reduced-motion via CSS.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: As = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: React.ElementType
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <As
      ref={ref}
      data-reveal={shown ? 'shown' : 'hidden'}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(className)}
    >
      {children}
    </As>
  )
}
