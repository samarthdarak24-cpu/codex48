/**
 * PdfPreview — lazy wrapper around react-pdf.
 *
 * The document is fetched with the caller's bearer token (via
 * `api.fetchGuidelineBlobUrl` / `api.fetchAssetBlobUrl`), converted to an
 * object URL, and revoked on unmount. If the record has no stored file we say
 * so plainly instead of rendering an empty frame.
 */
import React, { Suspense, useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

const PdfCanvas = React.lazy(() => import('./pdf/PdfCanvas'));

export interface PdfPreviewProps {
  /** Resolves an authenticated object URL, or null when no file is stored. */
  load: () => Promise<string | null>;
  /** Re-fetch when this changes (e.g. document id). */
  resetKey?: string;
  height?: number;
  emptyLabel?: string;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  load,
  resetKey,
  height = 460,
  emptyLabel = 'No stored PDF for this record.',
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setState('loading');
    setUrl(null);

    load()
      .then((next) => {
        created = next;
        if (cancelled) {
          if (next) URL.revokeObjectURL(next);
          return;
        }
        setUrl(next);
        setState(next ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setState('missing');
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-line bg-cream-50 py-16 text-2xs text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Fetching document…
      </div>
    );
  }

  if (state === 'missing' || !url) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-cream-50 px-4 py-12 text-center">
        <FileText className="h-6 w-6 text-muted-light" />
        <p className="mt-2 text-xs font-semibold text-ink-600">No document stored</p>
        <p className="mt-0.5 max-w-sm text-2xs leading-relaxed text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 rounded-xl border border-line bg-cream-50 py-16 text-2xs text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading PDF renderer…
        </div>
      }
    >
      <PdfCanvas fileUrl={url} height={height} />
    </Suspense>
  );
};
