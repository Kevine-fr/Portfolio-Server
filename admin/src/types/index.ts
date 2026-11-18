export type ID = string;
export interface Timestamped { createdAt: string; updatedAt: string; }

export interface User extends Timestamped {
  _id: ID; email: string; name: string; role: 'admin' | 'editor'; isActive: boolean;
}
export interface Tag extends Timestamped {
  _id: ID; name: string; slug: string; color?: string; description?: string;
}
/** Where a piece of content comes from: typed in the admin or synced from GitHub. */
export type ContentSource = 'manual' | 'github';

export interface ProjectLanguage { name: string; bytes: number; percent: number; }
export interface ProjectGithubLink {
  repoId: number; fullName: string; owner?: string; name?: string; htmlUrl: string;
  defaultBranch?: string; stars: number; forks: number; language?: string;
  languages: ProjectLanguage[]; topics: string[];
  pushedAt?: string; repoCreatedAt?: string;
  contentPath?: string; configPath?: string; autoCover?: string;
  autoSync: boolean; adopted?: boolean; syncedAt?: string;
}
export interface Project extends Timestamped {
  _id: ID; title: string; slug: string; subtitle?: string;
  description?: string; longDescription?: string;
  contentFormat?: 'text' | 'markdown';
  techStack: string[]; tags: Tag[] | ID[];
  coverImage?: string | null; gallery: string[]; demoVideo?: string | null;
  liveUrl?: string | null; repoUrl?: string | null;
  featured: boolean; order: number;
  status: 'draft' | 'published' | 'archived';
  year?: number | null;
  source?: ContentSource;
  github?: ProjectGithubLink;
}
export type SkillCategory = 'frontend' | 'backend' | 'tools' | 'design' | 'other';
export interface Skill extends Timestamped {
  _id: ID; name: string; category: SkillCategory; level: number;
  icon?: string | null; order: number; visible: boolean; source?: ContentSource;
}
export interface Experience extends Timestamped {
  _id: ID; title: string; company: string; location?: string;
  startDate: string; endDate?: string | null; current: boolean;
  description?: string; achievements: string[]; techStack: string[]; order: number;
  source?: ContentSource;
}
export interface Education extends Timestamped {
  _id: ID; school: string; degree: string; field?: string; location?: string;
  startDate: string; endDate?: string | null; description?: string; order: number;
  source?: ContentSource;
}
export interface Contact extends Timestamped {
  _id: ID; name: string; email: string; subject?: string; message: string;
  read: boolean; archived: boolean; ip?: string; userAgent?: string;
}

export interface TimelineEntry {
  year: string;
  title: string;
  description?: string;
  order?: number;
}
export interface ValueEntry {
  icon: string;
  title: string;
  description?: string;
  order?: number;
}
export interface HeroStat {
  label: string;
  value: number;
  order?: number;
}
export interface About extends Partial<Timestamped> {
  _id?: ID;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  tagline?: string;
  stats?: HeroStat[];
  title?: string;
  bio?: string;
  cvUrl?: string;
  cvFilename?: string;
  timeline: TimelineEntry[];
  values: ValueEntry[];
}

// ─── GitHub synchronisation ────────────────────────────────────────────────
export interface RateLimit { limit: number; remaining: number; reset: string | null; }

export interface GithubSettings {
  username: string;
  effectiveUsername: string;
  topic: string;
  selectedRepos: string[];
  excludedRepos: string[];
  includeForks: boolean;
  syncProjects: boolean;
  syncSkills: boolean;
  syncProfile: boolean;
  profileRepo: string;
  minLanguagePercent: number;
  autoSync: boolean;
  syncIntervalMinutes: number;
  tokenConfigured: boolean;
  lastSyncAt?: string | null;
  lastSyncReport?: GithubSyncReport | null;
}

export type RepoInclusion = 'selected' | 'topic' | null;

export interface GithubRepoSummary {
  id: number; name: string; fullName: string; description: string | null;
  htmlUrl: string; homepage: string | null; language: string | null;
  stars: number; forks: number; topics: string[];
  fork: boolean; archived: boolean; pushedAt: string | null;
  isProfileRepo: boolean;
  inclusion: RepoInclusion;
  selected: boolean; excluded: boolean;
  project: { id: string; slug: string; title: string; status: string; autoSync: boolean } | null;
}

export interface GithubReposResponse {
  username: string; topic: string; tokenConfigured: boolean;
  rateLimit: RateLimit | null;
  repos: GithubRepoSummary[];
}

export interface SyncCounters { created: number; updated: number; removed: number; }

export interface GithubSyncReport {
  trigger: 'manual' | 'schedule';
  username: string;
  startedAt: string; finishedAt?: string; durationMs?: number;
  ok: boolean;
  reposScanned: number; reposIncluded: number;
  projects: {
    created: string[]; updated: string[]; removed: string[]; detached: string[];
    skipped: Array<{ repo: string; reason: string }>;
  };
  skills: SyncCounters; experiences: SyncCounters; education: SyncCounters;
  about: boolean;
  warnings: string[]; errors: string[];
  rateLimit?: RateLimit | null;
}

export interface GithubStatus {
  running: boolean; username: string; tokenConfigured: boolean;
  lastSyncAt: string | null; lastSyncReport: GithubSyncReport | null;
  rateLimit: RateLimit | null;
}
