'use client';
import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, X, Upload as UploadIcon, ExternalLink, Download } from 'lucide-react';
import { api, resolveMediaUrl, filenameFromUrl, deleteMedia, getErrorMessage } from '@/lib/api';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface DocumentUploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

interface Props {
  /** Stored path/URL (e.g. /uploads/abc.pdf) */
  value?: string;
  /** Filename to display + use as download attribute */
  filename?: string;
  /** Called on upload success or removal — receives (url, originalName) */
  onChange: (url: string, originalName?: string) => void;
  className?: string;
  hardDelete?: boolean;
}

const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function uploadDocument(file: File, onProgress?: (p: number) => void): Promise<DocumentUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  return api.post<DocumentUploadResponse>('/uploads/document', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  }).then(r => r.data);
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function DocumentUpload({ value, filename, onChange, className, hardDelete = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [meta, setMeta] = useState<{ size?: number; mimetype?: string }>({});

  const url = resolveMediaUrl(value);
  const displayName = filename || (value ? filenameFromUrl(value) || 'document.pdf' : '');

  const doUpload = async (file: File) => {
    setUploading(true); setProgress(0);
    try {
      const res = await uploadDocument(file, setProgress);
      onChange(res.url, res.originalName || file.name);
      setMeta({ size: res.size, mimetype: res.mimetype });
      toast.success('Document téléversé');
    } catch (err) {
      toast.error('Échec de l\'envoi', { description: getErrorMessage(err) });
    } finally {
      setUploading(false); setProgress(0);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  const handleRemove = async () => {
    if (hardDelete && value) {
      const fn = filenameFromUrl(value);
      if (fn) { try { await deleteMedia(fn); } catch { /* silent */ } }
    }
    onChange('', '');
    setMeta({});
  };

  return (
    <div className={cn('space-y-2', className)}>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleChange} />

      {url ? (
        <div className="flex items-start gap-3 rounded-md border bg-card p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {(meta.size || meta.mimetype) && (
              <p className="text-xs text-muted-foreground">
                {meta.mimetype || 'PDF'} · {formatSize(meta.size)}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Aperçu
              </a>
              <a
                href={url}
                download={displayName}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Download className="h-3 w-3" /> Tester le téléchargement
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <UploadIcon className="h-3 w-3" /> Remplacer
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleRemove} disabled={uploading} className="text-destructive hover:text-destructive">
              <X className="h-3 w-3" /> Retirer
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={uploading}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/20 p-6 text-sm text-muted-foreground transition-colors',
            'hover:border-primary hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50',
            dragging && 'border-primary bg-muted/50',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">Envoi… {progress}%</span>
            </>
          ) : (
            <>
              <FileText className="h-8 w-8" />
              <span className="font-medium">Cliquez ou glissez votre CV</span>
              <span className="text-xs">PDF, DOC, DOCX · 20 Mo max</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
