'use client';
import { Github } from 'lucide-react';
import type { ContentSource } from '@/types';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

/** Small "GitHub" marker for content managed by the GitHub synchronisation. */
export function SourceBadge({ source, className, detached }: { source?: ContentSource; className?: string; detached?: boolean }) {
  if (source !== 'github') return null;
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-[10px] font-normal', className)}
      title={detached ? 'Importé depuis GitHub — synchronisation désactivée' : 'Synchronisé depuis GitHub : vos modifications peuvent être écrasées'}
    >
      <Github className="h-3 w-3" /> {detached ? 'GitHub (détaché)' : 'GitHub'}
    </Badge>
  );
}
