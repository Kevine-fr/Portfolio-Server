'use client';
import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X, Upload as UploadIcon } from 'lucide-react';
import { uploadMedia, deleteMedia, resolveMediaUrl, filenameFromUrl, getErrorMessage } from '@/lib/api';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface Props {
  value?: string;
  onChange: (path: string) => void;
  className?: string;
  /** small = compact icon preview (~12rem); default = full preview */
  size?: 'sm' | 'default';
  /** When true, delete the file from server when user removes it */
  hardDelete?: boolean;
}

export function ImageUpload({ value, onChange, className, size = 'default', hardDelete = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [dragging, setDragging]   = useState(false);

  const previewUrl = resolveMediaUrl(value);

  const doUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Format invalide', { description: 'Veuillez choisir une image.' });
      return;
    }
    setUploading(true); setProgress(0);
    try {
      const res = await uploadMedia(file, 'image', setProgress);
      onChange(res.url);
      toast.success('Image téléversée');
    } catch (err) {
      toast.error('Échec de l\'envoi', { description: getErrorMessage(err) });
    } finally {
      setUploading(false); setProgress(0);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = ''; // reset for re-upload of same file
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
    onChange('');
  };

  const isSmall = size === 'sm';

  return (
    <div className={cn('space-y-2', className)}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

      {previewUrl ? (
        <div className={cn(
          'group relative overflow-hidden rounded-md border bg-muted/30',
          isSmall ? 'h-24 w-24' : 'aspect-video max-h-72',
        )}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Aperçu" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <UploadIcon className="h-3.5 w-3.5" /> Remplacer
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={handleRemove} disabled={uploading}>
              <X className="h-3.5 w-3.5" /> Retirer
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
            isSmall ? 'h-24 w-24 p-2' : 'aspect-video max-h-72',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">Envoi… {progress}%</span>
            </>
          ) : (
            <>
              <ImagePlus className={cn(isSmall ? 'h-5 w-5' : 'h-8 w-8')} />
              {!isSmall && (
                <>
                  <span className="font-medium">Cliquez ou glissez une image</span>
                  <span className="text-xs">JPG, PNG, WebP, GIF, AVIF · 10 Mo max</span>
                </>
              )}
            </>
          )}
        </button>
      )}
    </div>
  );
}
