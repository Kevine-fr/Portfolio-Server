/** Subset of the GitHub REST "repository" object used by the sync. */
export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  fork: boolean;
  archived: boolean;
  disabled?: boolean;
  private?: boolean;
  pushed_at: string | null;
  created_at: string;
  updated_at?: string;
  default_branch: string;
}

export interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  blog: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
}

export interface GithubContentEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  /** ISO date at which the quota resets. */
  reset: string | null;
}

export interface SyncCounters {
  created: number;
  updated: number;
  removed: number;
}

export interface SyncReport {
  trigger: 'manual' | 'schedule';
  username: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  ok: boolean;
  reposScanned: number;
  reposIncluded: number;
  projects: {
    created: string[];
    updated: string[];
    removed: string[];
    detached: string[];
    skipped: Array<{ repo: string; reason: string }>;
  };
  skills: SyncCounters;
  experiences: SyncCounters;
  education: SyncCounters;
  about: boolean;
  warnings: string[];
  errors: string[];
  rateLimit?: RateLimitInfo | null;
}

export function emptyReport(trigger: SyncReport['trigger'], username: string): SyncReport {
  return {
    trigger,
    username,
    startedAt: new Date().toISOString(),
    ok: true,
    reposScanned: 0,
    reposIncluded: 0,
    projects: { created: [], updated: [], removed: [], detached: [], skipped: [] },
    skills: { created: 0, updated: 0, removed: 0 },
    experiences: { created: 0, updated: 0, removed: 0 },
    education: { created: 0, updated: 0, removed: 0 },
    about: false,
    warnings: [],
    errors: [],
  };
}
