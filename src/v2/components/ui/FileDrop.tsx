/**
 * FileDrop — the single upload surface for the app.
 *
 * The old drop zones were `onDragOver`/`onDrop` divs with no type validation,
 * no size ceiling, no keyboard path and no way to tell the user *why* a file
 * was refused. react-dropzone gives us all four, so every upload in Precedent
 * now rejects the same way and reports the same reasons.
 *
 * This is a presentational + validation wrapper only: it never uploads. The
 * caller decides what to do with the accepted `File` (local preview, or a real
 * `api.uploadPoster` / `api.uploadAsset` / `api.uploadGuidelineFile` call).
 */
import React, { useCallback, useState } from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { AlertCircle, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadAnimation } from '../motion';

export interface FileDropProps {
  onFile: (file: File) => void;
  /** react-dropzone accept map, e.g. `{ 'image/*': ['.png', '.jpg'] }`. */
  accept?: Accept;
  /** Bytes. Defaults to 25 MB. */
  maxSize?: number;
  disabled?: boolean;
  title?: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
  /** Shown under the hint, e.g. the exact accepted extensions. */
  formats?: string;
}

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

const rejectionMessage = (rejection: FileRejection, maxSize: number): string => {
  const code = rejection.errors[0]?.code;
  if (code === 'file-too-large') return `That file is larger than ${mb(maxSize)}.`;
  if (code === 'file-invalid-type') return 'That file type is not supported here.';
  if (code === 'too-many-files') return 'Only one file can be attached at a time.';
  return rejection.errors[0]?.message ?? 'That file could not be accepted.';
};

export const FileDrop: React.FC<FileDropProps> = ({
  onFile,
  accept,
  maxSize = 25 * 1024 * 1024,
  disabled = false,
  title = 'Drag and drop your file here',
  hint = 'or browse your device',
  icon,
  className,
  formats,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        setError(rejectionMessage(rejections[0], maxSize));
        return;
      }
      if (accepted[0]) {
        setError(null);
        onFile(accepted[0]);
      }
    },
    [maxSize, onFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: handleDrop,
    accept,
    maxSize,
    multiple: false,
    disabled,
  });

  return (
    <div className={cn('w-full', className)}>
      <div {...getRootProps()} className="outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60 focus-visible:ring-offset-2 rounded-2xl">
        <input {...getInputProps()} aria-label="Choose a file to attach" />
        <UploadAnimation
          isDragging={isDragActive}
          className={cn(
            'flex min-h-[190px] cursor-pointer flex-col items-center justify-center p-6 text-center',
            isDragReject && 'border-danger-300 bg-danger-50/40',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'mb-2 transition-colors',
                isDragActive ? 'text-brand-600' : isDragReject ? 'text-danger-500' : 'text-brand-400',
              )}
            >
              {icon ?? <UploadCloud className="h-8 w-8" />}
            </span>
            <p className="text-xs font-semibold text-ink-700">
              {isDragReject ? 'That file type is not accepted' : isDragActive ? 'Drop to attach' : title}
            </p>
            <span className="mt-1 text-2xs font-semibold text-brand-600 underline-offset-2 hover:underline">
              {hint}
            </span>
            {formats && <p className="mt-2 text-2xs text-muted-light">{formats}</p>}
          </div>
        </UploadAnimation>
      </div>

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-2xs text-danger-700">
          <AlertCircle className="mt-px h-3 w-3 shrink-0 text-danger-500" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
