import { describe, expect, it } from 'vitest';
import { emptyToNull, filenameFromUrl, getErrorMessage, resolveMediaUrl } from '@/lib/api';
import { filterRepos, inclusionLabel, rateLimitLabel, summarizeReport } from '@/lib/github';
import { NAV_ITEMS } from '@/components/layout/nav-config';
import type { GithubRepoSummary, GithubSyncReport } from '@/types';

describe('api helpers', () => {
  it('resolves media URLs against the API origin', () => {
    expect(resolveMediaUrl('/uploads/a.png')).toBe('http://localhost:3001/uploads/a.png');
    expect(resolveMediaUrl('https://cdn.dev/a.png')).toBe('https://cdn.dev/a.png');
    expect(resolveMediaUrl('')).toBe('');
    expect(resolveMediaUrl(null)).toBe('');
  });

  it('extracts upload file names', () => {
    expect(filenameFromUrl('/uploads/1-ab.png')).toBe('1-ab.png');
    expect(filenameFromUrl('http://api.dev/uploads/my%20file.pdf?v=2')).toBe('my file.pdf');
    expect(filenameFromUrl('https://raw.githubusercontent.com/o/r/main/a.png')).toBeNull();
    expect(filenameFromUrl(undefined)).toBeNull();
  });

  it('builds readable error messages', () => {
    expect(getErrorMessage({ response: { data: { message: ['a', 'b'] } } })).toBe('a, b');
    expect(getErrorMessage({ response: { data: { message: 'Projet introuvable' } } })).toBe('Projet introuvable');
    expect(getErrorMessage({ response: { status: 429, data: {} } })).toMatch(/Trop de requêtes/);
    expect(getErrorMessage({ code: 'ERR_NETWORK' })).toMatch(/injoignable/);
    expect(getErrorMessage({}, 'fallback')).toBe('fallback');
  });

  it('turns empty values into null', () => {
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
    expect(emptyToNull('x')).toBe('x');
  });
});

const report = (over: Partial<GithubSyncReport> = {}): GithubSyncReport => ({
  trigger: 'manual', username: 'kev', startedAt: '', ok: true, reposScanned: 3, reposIncluded: 2,
  projects: { created: [], updated: [], removed: [], detached: [], skipped: [] },
  skills: { created: 0, updated: 0, removed: 0 },
  experiences: { created: 0, updated: 0, removed: 0 },
  education: { created: 0, updated: 0, removed: 0 },
  about: false, warnings: [], errors: [], ...over,
});

const repo = (over: Partial<GithubRepoSummary>): GithubRepoSummary => ({
  id: 1, name: 'app', fullName: 'kev/app', description: null, htmlUrl: '', homepage: null, language: null,
  stars: 0, forks: 0, topics: [], fork: false, archived: false, pushedAt: null, isProfileRepo: false,
  inclusion: null, selected: false, excluded: false, project: null, ...over,
});

describe('github helpers', () => {
  it('summarizes sync reports in French', () => {
    expect(summarizeReport(report())).toBe('Aucun changement');
    expect(
      summarizeReport(report({
        projects: { created: ['A', 'B'], updated: ['C'], removed: [], detached: [], skipped: [] },
        skills: { created: 1, updated: 0, removed: 0 },
        about: true,
      })),
    ).toBe('2 projets ajoutés · 1 projet mis à jour · 1 compétence modifiée · « À propos » mis à jour');
  });

  it('labels the inclusion reason', () => {
    expect(inclusionLabel(repo({ inclusion: 'selected' }))).toBe('Sélectionné');
    expect(inclusionLabel(repo({ inclusion: 'topic' }), 'portfolio')).toBe('Topic « portfolio »');
    expect(inclusionLabel(repo({ isProfileRepo: true }))).toBe('Dépôt de profil');
    expect(inclusionLabel(repo({}))).toBe('Non affiché');
  });

  it('filters repositories by text and state', () => {
    const repos = [
      repo({ id: 1, name: 'portfolio-3d', inclusion: 'topic', topics: ['threejs'] }),
      repo({ id: 2, name: 'api', language: 'Go' }),
    ];
    expect(filterRepos(repos, '', 'shown').map((r) => r.name)).toEqual(['portfolio-3d']);
    expect(filterRepos(repos, '', 'hidden').map((r) => r.name)).toEqual(['api']);
    expect(filterRepos(repos, 'three', 'all').map((r) => r.name)).toEqual(['portfolio-3d']);
    expect(filterRepos(repos, 'go', 'all').map((r) => r.name)).toEqual(['api']);
  });

  it('formats the quota', () => {
    expect(rateLimitLabel({ limit: 60, remaining: 12, reset: null })).toBe('12/60 requêtes restantes');
    expect(rateLimitLabel(null)).toBeNull();
  });

  it('adds the GitHub page to the navigation', () => {
    expect(NAV_ITEMS.find((i) => i.href === '/github')).toMatchObject({ label: 'GitHub' });
  });
});
