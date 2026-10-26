/**
 * Precedent — temporary demo store.
 *
 * ⚠️  FRONTEND-ONLY STAND-IN — remove in Phase 4.
 *
 * The product's source of truth is PostgreSQL behind the FastAPI service. Until
 * that service is connected, mutations made in the UI would vanish on reload,
 * which makes the review → decision → audit workflow impossible to demonstrate
 * end to end.
 *
 * This module keeps the in-memory working set in `sessionStorage` (per browser
 * tab, cleared when the tab closes) so a reload or a role switch preserves the
 * records you just created. It is deliberately isolated here and is deleted the
 * moment `services/api.ts` talks to the real backend — no component knows it
 * exists.
 *
 * Nothing here is presented to the user as real customer data: the workspace is
 * labelled "Fictional demo workspace" in the sidebar.
 */

import type { DataBundle } from '@/context/DataContext'

const KEY = 'precedent.demo.v1'

export function loadDemoBundle(): DataBundle | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { savedAt: number; bundle: DataBundle }
    if (!parsed?.bundle) return null
    return parsed.bundle
  } catch {
    return null
  }
}

export function saveDemoBundle(bundle: DataBundle): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), bundle }))
  } catch {
    /* quota exceeded — the session simply falls back to the seed dataset */
  }
}

export function clearDemoBundle(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
