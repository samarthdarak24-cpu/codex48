/**
 * PdfCanvas — the only module that imports react-pdf.
 *
 * Kept in its own file so `PdfPreview` can `React.lazy` it: pdf.js plus its
 * worker is ~300 kB, and nothing on the 21 screens needs it until a manager
 * actually opens a document. The worker URL is resolved through Vite's `?url`
 * handling of the bundled `pdfjs-dist` build.
 */
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface PdfCanvasProps {
  /** Object URL created from the authenticated blob fetch. */
  fileUrl: string;
  height?: number;
}

export default function PdfCanvas({ fileUrl, height = 460 }: PdfCanvasProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  /* The page must fit the container it is dropped into (a 460px drawer, a
     modal, a full-width panel), not the viewport — measuring the parent is the
     only way to avoid clipping the document. */
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(220, el.clientWidth - 20));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-cream-50 px-4 py-10 text-center">
        <p className="text-xs font-semibold text-ink-600">This PDF could not be rendered</p>
        <p className="mt-0.5 max-w-sm text-2xs leading-relaxed text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={frameRef}
        className="overflow-auto rounded-xl border border-line bg-cream-100 p-2"
        style={{ maxHeight: height }}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={(e) => setError(e?.message ?? 'The file could not be parsed.')}
          loading={
            <div className="flex items-center justify-center gap-2 py-16 text-2xs text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Rendering document…
            </div>
          }
          className="flex flex-col items-center gap-2"
        >
          {width > 0 && (
            <Page
              pageNumber={page}
              width={width}
              renderAnnotationLayer
              renderTextLayer
              className="overflow-hidden rounded-lg bg-white shadow-card"
              loading={
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                </div>
              }
            />
          )}
        </Document>
      </div>

      {numPages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
            className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-cream-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-2xs tabular-nums text-muted">
            Page {page} of {numPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page >= numPages}
            aria-label="Next page"
            className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-cream-50 disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
