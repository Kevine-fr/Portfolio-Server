'use client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { GithubSyncReport } from '@/types';
import { summarizeReport } from '@/lib/github';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function List({ title, items, tone }: { title: string; items: string[]; tone: 'error' | 'warning' | 'muted' }) {
  if (!items.length) return null;
  const color = tone === 'error' ? 'text-destructive' : tone === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground';
  return (
    <details className="rounded-md border p-3" open={tone === 'error'}>
      <summary className={`cursor-pointer text-sm font-medium ${color}`}>{title} ({items.length})</summary>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {items.map((m, i) => <li key={i} className="break-words">• {m}</li>)}
      </ul>
    </details>
  );
}

export function GithubSyncReportCard({ report, lastSyncAt, running }: { report?: GithubSyncReport | null; lastSyncAt?: string | null; running?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Dernière synchronisation</CardTitle>
          <CardDescription>
            {running ? 'Synchronisation en cours…' : lastSyncAt
              ? `${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: fr })}${report?.trigger === 'schedule' ? ' (automatique)' : ''}`
              : 'Jamais synchronisé.'}
          </CardDescription>
        </div>
        {report && !running && (
          report.ok
            ? <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Réussie</Badge>
            : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Erreurs</Badge>
        )}
      </CardHeader>
      {report && (
        <CardContent className="space-y-3">
          <p className="text-sm">{summarizeReport(report)}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{report.reposIncluded}/{report.reposScanned} dépôts affichés</span>
            {report.durationMs !== undefined && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {(report.durationMs / 1000).toFixed(1)} s</span>}
            {report.rateLimit && <span>Quota restant : {report.rateLimit.remaining}/{report.rateLimit.limit}</span>}
          </p>
          <List title="Erreurs" items={report.errors} tone="error" />
          <List title="Avertissements" items={report.warnings} tone="warning" />
          <List title="Dépôts ignorés" items={report.projects.skipped.map((s) => `${s.repo} — ${s.reason}`)} tone="muted" />
          {!report.ok && !report.errors.length && (
            <p className="flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3 w-3" /> Synchronisation incomplète.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
