'use client';
import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Film, Loader2, X, Upload as UploadIcon } from 'lucide-react';
import { uploadMedia, deleteMedia, resolveMediaUrl, filenameFromUrl, getErrorMessage } from '@/lib/api';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface Props {
  value?: string;
  onChange: (path: string) => void;
  className?: string;
  hardDelete?: boolean;
}

export function VideoUpload({ value, onChange, className, hardDelete = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [dragging, setDragging]   = useState(false);

  const url = resolveMediaUrl(value);

  const doUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Format invalide', { description: 'Veuillez choisir une vidéo (MP4, WebM, MOV).' });
      return;
    }
    setUploading(true); setProgress(0);
    try {
      const res = await uploadMedia(file, 'video', setProgress);
      onChange(res.url);
      toast.success('Vidéo téléversée');
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
    onChange('');
  };

  const [videoError, setVideoError] = useState(false);

  // Reset error state when URL changes
  const previousUrlRef = useRef<string | undefined>(undefined);
  if (previousUrlRef.current !== value) {
    previousUrlRef.current = value;
    if (videoError) setVideoError(false);
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleChange} />

      {url ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-md border bg-black">
            {videoError ? (
              <div className="flex flex-col items-center justify-center gap-2 aspect-video p-6 text-center text-sm text-muted-foreground">
                <Film className="h-8 w-8" />
                <p className="font-medium text-foreground">Vidéo enregistrée</p>
                <p className="text-xs">
                  Le format n'est pas lisible par le navigateur (MKV, AVI…)<br/>
                  Convertis-la en MP4 ou WebM pour qu'elle s'affiche.
                </p>
              </div>
            ) : (
              <video
                src={url}
                controls
                preload="metadata"
                className="w-full max-h-72 mx-auto"
                onError={() => setVideoError(true)}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex-1">
              <UploadIcon className="h-3.5 w-3.5" /> Remplacer la vidéo
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleRemove} disabled={uploading} className="text-destructive hover:text-destructive">
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
            'flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/20 p-6 text-sm text-muted-foreground transition-colors aspect-video max-h-72',
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
              <Film className="h-8 w-8" />
              <span className="font-medium">Cliquez ou glissez une vidéo</span>
              <span className="text-xs text-center">
                MP4 ou WebM recommandés pour la lecture web · 100 Mo max
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
