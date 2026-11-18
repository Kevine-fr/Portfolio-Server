'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Github, Loader2, RefreshCw } from 'lucide-react';
import { apiGet, apiPost, apiPut, getErrorMessage } from '@/lib/api';
import { summarizeReport } from '@/lib/github';
import { useAuth } from '@/lib/auth';
import type { GithubReposResponse, GithubRepoSummary, GithubSettings, GithubStatus, GithubSyncReport } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { GithubSettingsCard, GithubSettingsPatch } from '@/components/github/github-settings-card';
import { GithubSyncReportCard } from '@/components/github/github-sync-report';
import { GithubRepoList } from '@/components/github/github-repo-list';
import { PortfolioYmlHelp } from '@/components/github/portfolio-yml-help';

/** Everything that a sync can change. */
const SYNCED_QUERIES = ['github', 'projects', 'skills', 'experiences', 'education', 'about'];

export default function GithubPage() {
  const qc = useQueryClient();
  const isAdmin = useAuth((s) => s.user?.role === 'admin');
  const [pendingRepo, setPendingRepo] = useState<string | null>(null);

  const settings = useQuery({ queryKey: ['github', 'settings'], queryFn: () => apiGet<GithubSettings>('/github/settings') });
  const status = useQuery({
    queryKey: ['github', 'status'],
    queryFn: () => apiGet<GithubStatus>('/github/status'),
    // Poll while a (scheduled) sync is running
    refetchInterval: (q) => (q.state.data?.running ? 3000 : false),
  });
  const username = settings.data?.effectiveUsername;
  const repos = useQuery({
    queryKey: ['github', 'repos', username],
    queryFn: () => apiGet<GithubReposResponse>('/github/repos'),
    enabled: !!username,
    staleTime: 60_000,
  });

  const invalidateAll = () => Promise.all(SYNCED_QUERIES.map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const sync = useMutation({
    mutationFn: () => apiPost<GithubSyncReport>('/github/sync'),
    onSuccess: (report) => {
      invalidateAll();
      const description = summarizeReport(report);
      if (report.ok) toast.success('Synchronisation terminée', { description });
      else toast.warning('Synchronisation terminée avec des erreurs', { description: report.errors[0] ?? description });
    },
    onError: (err) => toast.error('Échec de la synchronisation', { description: getErrorMessage(err) }),
  });

  const saveSettings = useMutation({
    mutationFn: (patch: GithubSettingsPatch) => apiPut<GithubSettings>('/github/settings', patch),
    onSuccess: (data) => {
      qc.setQueryData(['github', 'settings'], data);
      qc.invalidateQueries({ queryKey: ['github'] });
      toast.success('Réglages enregistrés');
    },
    onError: (err) => toast.error("Échec de l'enregistrement", { description: getErrorMessage(err) }),
  });

  const toggleRepo = useMutation({
    mutationFn: ({ repo, included }: { repo: GithubRepoSummary; included: boolean }) =>
      apiPut(`/github/repos/${encodeURIComponent(repo.name)}/selection`, { included }),
    onMutate: ({ repo }) => setPendingRepo(repo.name),
    onSuccess: (_d, { repo, included }) => {
      qc.invalidateQueries({ queryKey: ['github'] });
      toast.success(included ? `${repo.name} sera affiché` : `${repo.name} sera retiré`, {
        description: 'Appliqué à la prochaine synchronisation.',
        action: { label: 'Synchroniser', onClick: () => sync.mutate() },
      });
    },
    onError: (err) => toast.error('Échec', { description: getErrorMessage(err) }),
    onSettled: () => setPendingRepo(null),
  });

  const toggleAutoSync = useMutation({
    mutationFn: ({ id, autoSync }: { id: string; autoSync: boolean }) => apiPut(`/github/projects/${id}/auto-sync`, { autoSync }),
    onSuccess: (_d, { autoSync }) => {
      invalidateAll();
      toast.success(autoSync ? 'Synchronisation réactivée' : 'Projet détaché', {
        description: autoSync ? 'Il sera mis à jour depuis GitHub.' : 'Vos modifications dans l’admin ne seront plus écrasées.',
      });
    },
    onError: (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });

  const running = sync.isPending || !!status.data?.running;

  return (
    <>
      <PageHeader
        title="GitHub"
        description="Vos dépôts, compétences et parcours synchronisés depuis votre compte GitHub."
        actions={
          <Button onClick={() => sync.mutate()} disabled={running || !username}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {running ? 'Synchronisation…' : 'Synchroniser maintenant'}
          </Button>
        }
      />

      {settings.isLoading ? (
        <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /></div>
      ) : settings.isError || !settings.data ? (
        <EmptyState icon={Github} title="Réglages indisponibles" description={getErrorMessage(settings.error)} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <GithubSettingsCard
              settings={settings.data}
              rateLimit={status.data?.rateLimit}
              canEdit={isAdmin}
              saving={saveSettings.isPending}
              onSave={(patch) => saveSettings.mutate(patch)}
            />
            <GithubSyncReportCard
              report={status.data?.lastSyncReport ?? settings.data.lastSyncReport}
              lastSyncAt={status.data?.lastSyncAt ?? settings.data.lastSyncAt}
              running={running}
            />
          </div>
          <div className="space-y-6">
            {!username ? (
              <EmptyState icon={Github} title="Aucun compte connecté" description="Renseignez votre identifiant GitHub pour lister vos dépôts." />
            ) : repos.isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : repos.isError || !repos.data ? (
              <EmptyState icon={Github} title="Impossible de lister les dépôts" description={getErrorMessage(repos.error)}
                action={<Button variant="outline" onClick={() => repos.refetch()}>Réessayer</Button>} />
            ) : (
              <GithubRepoList
                repos={repos.data.repos}
                topic={repos.data.topic}
                pendingRepo={pendingRepo}
                onToggle={(repo, included) => toggleRepo.mutate({ repo, included })}
                onToggleAutoSync={(id, autoSync) => toggleAutoSync.mutate({ id, autoSync })}
              />
            )}
            <PortfolioYmlHelp />
          </div>
        </div>
      )}
    </>
  );
}
