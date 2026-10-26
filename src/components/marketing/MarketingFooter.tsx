import { Link } from 'react-router-dom'
import { Github, Linkedin, Twitter, Youtube } from 'lucide-react'
import { BrandMark } from '@/components/layout/Shell'

const COLUMNS = [
  {
    title: 'Product',
    links: ['Platform', 'Evidence reviews', 'Rule sandbox', 'Exceptions', 'Audit trail'],
  },
  {
    title: 'Solutions',
    links: ['Brand teams', 'In-house creative', 'Agencies', 'Retail & packaging', 'Multi-brand'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Governance guide', 'Changelog', 'Status', 'API reference'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Customers', 'Press', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Security', 'DPA', 'Cookie settings'],
  },
]

const SOCIALS = [
  { icon: Twitter, label: 'X' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Github, label: 'GitHub' },
  { icon: Youtube, label: 'YouTube' },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink/[0.07] bg-white">
      <div className="mkt-container py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
          <div>
            <Link to="/" className="flex items-center gap-2.5" aria-label="Precedent home">
              <BrandMark size={28} />
              <span className="text-[18px] font-bold tracking-[-0.025em] text-ink">Precedent</span>
            </Link>
            <p className="mt-3 max-w-[240px] text-[13px] leading-[20px] text-muted">
              A smarter way to manage brand rules and approvals. Every decision, with its evidence.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 text-ink-600 transition-colors hover:border-ink/25 hover:text-ink"
                >
                  <s.icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-[13px] text-muted transition-colors hover:text-ink">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-muted-light">© {new Date().getFullYear()} Precedent. All rights reserved.</p>
          <p className="text-[12px] text-muted-light">
            8 core governance features · 12 screens · Built for brand teams
          </p>
        </div>

        <p className="mt-4 max-w-2xl text-[11px] leading-[17px] text-muted-light/90">
          Precedent is a demonstration product. Company names, campaign assets, customer stories and figures shown on
          this page are fictional and used for illustration only.
        </p>
      </div>
    </footer>
  )
}
