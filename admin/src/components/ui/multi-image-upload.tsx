'use client';
import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { uploadMedia, deleteMedia, resolveMediaUrl, filenameFromUrl, getErrorMessage } from '@/lib/api';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface Props {
  value: string[];
  onChange: (paths: string[]) => void;
  max?: number;
  className?: string;
  hardDelete?: boolean;
}

export function MultiImageUpload({ value, onChange, max = 30, className, hardDelete = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [dragging, setDragging]   = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number>(0); // for batch upload progress

  const remaining = max - value.length;

  const uploadBatch = async (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      toast.error('Aucune image valide dans la sélection');
      return;
    }
    const toUpload = validFiles.slice(0, remaining);
    if (validFiles.length > remaining) {
      toast.warning(`Maximum ${max} images`, { description: `${validFiles.length - remaining} image(s) ignorée(s).` });
    }
    if (toUpload.length === 0) return;

    setUploading(true);
    const uploaded: string[] = [];
    for (let i = 0; i < toUpload.length; i++) {
      setCurrentIdx(i + 1);
      setProgress(0);
      try {
        const res = await uploadMedia(toUpload[i], 'image', setProgress);
        uploaded.push(res.url);
      } catch (err) {
        toast.error(`Image ${i + 1} non envoyée`, { description: getErrorMessage(err) });
      }
    }
    if (uploaded.length > 0) {
      onChange([...value, ...uploaded]);
      toast.success(`${uploaded.length} image(s) ajoutée(s) à la galerie`);
    }
    setUploading(false); setProgress(0); setCurrentIdx(0);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) uploadBatch(files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length) uploadBatch(files);
  };

  const removeAt = async (idx: number) => {
    const removed = value[idx];
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
    if (hardDelete && removed) {
      const fn = filenameFromUrl(removed);
      if (fn) { try { await deleteMedia(fn); } catch { /* silent */ } }
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {value.map((url, idx) => (
            <div key={`${url}-${idx}`} className="group relative aspect-square overflow-hidden rounded-md border bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveMediaUrl(url)} alt={`Image ${idx + 1}`} className="h-full w-full object-cover" />
              <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {idx + 1}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-between p-1.5 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex w-full justify-end">
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="rounded-sm bg-destructive p-1 text-destructive-foreground hover:opacity-80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex w-full justify-between">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-sm bg-background/90 p-1 text-foreground hover:opacity-80 disabled:opacity-30"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === value.length - 1}
                    className="rounded-sm bg-background/90 p-1 text-foreground hover:opacity-80 disabled:opacity-30"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={uploading}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-input bg-muted/20 p-6 text-sm text-muted-foreground transition-colors',
            'hover:border-primary hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50',
            dragging && 'border-primary bg-muted/50',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Envoi {currentIdx} · {progress}%</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="font-medium">
                {value.length === 0 ? 'Ajouter des images' : 'Ajouter d\'autres images'}
              </span>
              <span className="text-xs">{value.length} / {max} · sélection multiple supportée</span>
            </>
          )}
        </button>
      )}

      {value.length >= max && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum atteint : {max} images.
        </p>
      )}
    </div>
  );
}
