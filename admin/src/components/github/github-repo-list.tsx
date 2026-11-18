'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Archive, ExternalLink, GitFork, Search, Star, Link2Off, Link2 } from 'lucide-react';
import type { GithubRepoSummary } from '@/types';
import { filterRepos, inclusionLabel, RepoFilter } from '@/lib/github';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface Props {
  repos: GithubRepoSummary[];
  topic?: string;
  pendingRepo?: string | null;
  onToggle: (repo: GithubRepoSummary, included: boolean) => void;
  onToggleAutoSync: (projectId: string, autoSync: boolean) => void;
}

const FILTERS: Array<{ value: RepoFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'shown', label: 'Affichés' },
  { value: 'hidden', label: 'Non affichés' },
];

export function GithubRepoList({ repos, topic, pendingRepo, onToggle, onToggleAutoSync }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RepoFilter>('all');
  const visible = useMemo(() => filterRepos(repos, query, filter), [repos, query, filter]);
  const shown = repos.filter((r) => r.inclusion !== null).length;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <CardTitle className="text-base">Dépôts ({shown}/{repos.length} affichés)</CardTitle>
          <CardDescription>Cochez un dépôt pour l&apos;afficher, puis synchronisez.</CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un dépôt, un langage, un topic…" className="pl-8" aria-label="Rechercher un dépôt" />
          </div>
          <div className="flex shrink-0 gap-1 rounded-md border p-1 sm:inline-flex sm:self-start">
            {FILTERS.map((f) => (
              <Button key={f.value} type="button" size="sm" className="flex-1 sm:flex-none" variant={filter === f.value ? 'secondary' : 'ghost'} onClick={() => setFilter(f.value)}>
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {visible.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Aucun dépôt ne correspond.</p>
        ) : (
          <ul className="divide-y">
            {visible.map((repo) => {
              const included = repo.inclusion !== null;
              return (
                <li key={repo.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:px-6" data-testid={`repo-${repo.name}`}>
                  <Checkbox
                    className="mt-1"
                    checked={included}
                    disabled={pendingRepo === repo.name}
                    onCheckedChange={(v) => onToggle(repo, !!v)}
                    aria-label={`Afficher ${repo.name} dans le portfolio`}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 break-all font-medium hover:underline">
                        {repo.name} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                      <Badge variant={included ? 'default' : 'outline'} className="text-[10px]">{inclusionLabel(repo, topic)}</Badge>
                      {repo.fork && <Badge variant="outline" className="gap-1 text-[10px]"><GitFork className="h-3 w-3" /> fork</Badge>}
                      {repo.archived && <Badge variant="outline" className="gap-1 text-[10px]"><Archive className="h-3 w-3" /> archivé</Badge>}
                    </div>
                    {repo.description && <p className="break-words text-sm text-muted-foreground">{repo.description}</p>}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {repo.language && <span>{repo.language}</span>}
                      <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {repo.stars}</span>
                      {repo.pushedAt && <span>mis à jour {formatDistanceToNow(new Date(repo.pushedAt), { addSuffix: true, locale: fr })}</span>}
                      {repo.topics.length > 0 && <span className="truncate">#{repo.topics.join(' #')}</span>}
                    </p>
                  </div>
                  {repo.project && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <Link href="/projects" className="text-xs text-primary hover:underline">Projet : {repo.project.title}</Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onToggleAutoSync(repo.project!.id, !repo.project!.autoSync)}
                        title={repo.project.autoSync ? 'Ne plus écraser ce projet lors des synchronisations' : 'Réactiver la synchronisation'}
                      >
                        {repo.project.autoSync ? <><Link2 className="h-3 w-3" /> Synchronisé</> : <><Link2Off className="h-3 w-3" /> Détaché</>}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
