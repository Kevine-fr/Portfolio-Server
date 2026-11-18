import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GithubRepoList } from '@/components/github/github-repo-list';
import GithubPage from '@/app/github/page';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import type { GithubRepoSummary } from '@/types';
import { renderWithClient } from './test-utils';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

const repo = (over: Partial<GithubRepoSummary>): GithubRepoSummary => ({
  id: 1, name: 'portfolio-3d', fullName: 'kev/portfolio-3d', description: 'Mon site 3D', htmlUrl: 'https://github.com/kev/portfolio-3d',
  homepage: null, language: 'JavaScript', stars: 4, forks: 0, topics: ['portfolio'], fork: false, archived: false,
  pushedAt: '2025-01-01T00:00:00Z', isProfileRepo: false, inclusion: 'topic', selected: false, excluded: false,
  project: { id: 'p1', slug: 'portfolio-3d', title: 'Portfolio 3D', status: 'published', autoSync: true }, ...over,
});

const settings = {
  username: 'kev', effectiveUsername: 'kev', topic: 'portfolio', selectedRepos: [], excludedRepos: [], includeForks: false,
  syncProjects: true, syncSkills: true, syncProfile: true, profileRepo: '', minLanguagePercent: 2, autoSync: true,
  syncIntervalMinutes: 60, tokenConfigured: false, lastSyncAt: null, lastSyncReport: null,
};

describe('GithubRepoList', () => {
  it('filters and toggles repositories', async () => {
    const onToggle = vi.fn();
    const onToggleAutoSync = vi.fn();
    renderWithClient(
      <GithubRepoList
        repos={[repo({}), repo({ id: 2, name: 'side', topics: [], inclusion: null, project: null, description: null })]}
        topic="portfolio"
        onToggle={onToggle}
        onToggleAutoSync={onToggleAutoSync}
      />,
    );
    expect(screen.getByText('Dépôts (1/2 affichés)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Afficher side dans le portfolio' }));
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'side' }), true);

    await userEvent.click(within(screen.getByTestId('repo-portfolio-3d')).getByRole('button', { name: /Synchronisé/ }));
    expect(onToggleAutoSync).toHaveBeenCalledWith('p1', false);

    await userEvent.type(screen.getByLabelText('Rechercher un dépôt'), 'side');
    expect(screen.queryByTestId('repo-portfolio-3d')).toBeNull();
    expect(screen.getByTestId('repo-side')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Rechercher un dépôt'));
    await userEvent.click(screen.getByRole('button', { name: 'Affichés' }));
    expect(screen.queryByTestId('repo-side')).toBeNull();
  });
});

describe('GitHub page', () => {
  beforeEach(() => {
    useAuth.setState({ user: { id: '1', email: 'a@b.c', name: 'A', role: 'admin' } });
    vi.mocked(api.apiGet).mockImplementation(async (url: string) => {
      if (url === '/github/settings') return settings;
      if (url === '/github/status') return { running: false, username: 'kev', tokenConfigured: false, lastSyncAt: null, lastSyncReport: null, rateLimit: { limit: 60, remaining: 55, reset: null } };
      if (url === '/github/repos') return { username: 'kev', topic: 'portfolio', tokenConfigured: false, rateLimit: null, repos: [repo({})] };
      throw new Error(`unexpected ${url}`);
    });
  });

  it('shows the account, the quota and the repositories', async () => {
    renderWithClient(<GithubPage />);
    expect(await screen.findByDisplayValue('kev')).toBeInTheDocument();
    expect(screen.getByText(/Aucun jeton GitHub/)).toBeInTheDocument();
    expect(screen.getByText(/55\/60 requêtes restantes/)).toBeInTheDocument();
    expect(await screen.findByText('portfolio-3d')).toBeInTheDocument();
    expect(screen.getByText('Jamais synchronisé.')).toBeInTheDocument();
  });

  it('runs a sync and reports the result', async () => {
    vi.mocked(api.apiPost).mockResolvedValue({
      ok: true, trigger: 'manual', username: 'kev', startedAt: '', reposScanned: 1, reposIncluded: 1,
      projects: { created: ['Portfolio 3D'], updated: [], removed: [], detached: [], skipped: [] },
      skills: { created: 2, updated: 0, removed: 0 }, experiences: { created: 0, updated: 0, removed: 0 },
      education: { created: 0, updated: 0, removed: 0 }, about: false, warnings: [], errors: [],
    });
    renderWithClient(<GithubPage />);
    await screen.findByText('portfolio-3d');
    await userEvent.click(screen.getByRole('button', { name: /Synchroniser maintenant/ }));
    await waitFor(() => expect(api.apiPost).toHaveBeenCalledWith('/github/sync'));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Synchronisation terminée', { description: '1 projet ajouté · 2 compétences modifiées' }),
    );
  });

  it('saves the settings', async () => {
    vi.mocked(api.apiPut).mockResolvedValue({ ...settings, topic: 'showcase' });
    renderWithClient(<GithubPage />);
    const topic = await screen.findByLabelText("Topic d'inclusion automatique");
    fireEvent.change(topic, { target: { value: 'Showcase' } });
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));
    await waitFor(() =>
      expect(api.apiPut).toHaveBeenCalledWith('/github/settings', expect.objectContaining({ username: 'kev', topic: 'showcase' })),
    );
  });

  it('validates the username before saving', async () => {
    renderWithClient(<GithubPage />);
    const input = await screen.findByLabelText(/Identifiant GitHub/);
    fireEvent.change(input, { target: { value: 'not valid!' } });
    expect(screen.getByText('Identifiant GitHub invalide')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeDisabled();
  });

  it('is read-only for editors', async () => {
    useAuth.setState({ user: { id: '2', email: 'e@b.c', name: 'E', role: 'editor' } });
    renderWithClient(<GithubPage />);
    expect(await screen.findByText(/Seul un administrateur/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).toBeNull();
  });

  it('includes a repository from the list', async () => {
    vi.mocked(api.apiGet).mockImplementation(async (url: string) => {
      if (url === '/github/settings') return settings;
      if (url === '/github/status') return { running: false, rateLimit: null, lastSyncAt: null, lastSyncReport: null };
      return { username: 'kev', topic: 'portfolio', repos: [repo({ name: 'side', inclusion: null, project: null })] };
    });
    vi.mocked(api.apiPut).mockResolvedValue({ selectedRepos: ['side'], excludedRepos: [] });
    renderWithClient(<GithubPage />);
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Afficher side dans le portfolio' }));
    await waitFor(() => expect(api.apiPut).toHaveBeenCalledWith('/github/repos/side/selection', { included: true }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('side sera affiché', expect.anything()));
  });
});
