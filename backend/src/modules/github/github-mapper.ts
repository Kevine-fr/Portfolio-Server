import type { SkillCategory } from '../skills/skill.schema';
import type { GithubRepo } from './github.types';
import type { EducationConfig, ExperienceConfig, ProjectConfig, SkillConfig } from './repo-config';
import {
  extractSummary, extractTitle, pickCoverImage, renderMarkdownWithMeta, resolveImageUrl, RepoContext,
} from './markdown';
import { guessCategory, languageInfo, lookupTech, uniqueNames } from './tech-catalog';

/** Everything fetched from GitHub for one repository. */
export interface RepoDetails {
  repo: GithubRepo;
  config: ProjectConfig;
  configPath?: string;
  /** Markdown used for the detail page (README or `content:` file). */
  content: { path: string; text: string } | null;
  languages: Record<string, number>;
  warnings: string[];
}

/** Minimal view of an existing project, used to merge without losing admin edits. */
export interface ExistingProjectView {
  slug?: string;
  source?: string;
  coverImage?: string | null;
  github?: { autoCover?: string; autoSync?: boolean; adopted?: boolean } | null;
}

export interface SettingsView {
  topic?: string;
  selectedRepos?: string[];
  excludedRepos?: string[];
  includeForks?: boolean;
  minLanguagePercent?: number;
}

export type InclusionReason = 'selected' | 'topic' | null;

// ─── Naming helpers ────────────────────────────────────────────────────────
export function slugify(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** "my-cool_app" / "PortfolioWeb" → "My Cool App" / "Portfolio Web". */
export function humanizeRepoName(name: string): string {
  return String(name ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => (w === w.toUpperCase() && w.length > 1 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

export function normalizeRepoUrl(url?: string | null): string {
  return String(url ?? '').trim().toLowerCase().replace(/\/+$/, '').replace(/\.git$/, '').replace(/\/+$/, '');
}

function isHttpUrl(value?: string | null): value is string {
  return !!value && /^https?:\/\/[^\s]+$/i.test(value.trim());
}

// ─── Repository selection ──────────────────────────────────────────────────
/**
 * A repository is shown when it is selected in the admin, or tagged with the
 * configured topic — unless it is excluded, a fork (topic mode) or the profile repo.
 */
export function repoInclusion(repo: GithubRepo, settings: SettingsView, profileRepo?: string): InclusionReason {
  const name = repo.name.toLowerCase();
  if ((settings.excludedRepos ?? []).includes(name)) return null;
  if ((settings.selectedRepos ?? []).includes(name)) return 'selected';
  if (repo.disabled || repo.private) return null;
  if (profileRepo && name === profileRepo.toLowerCase()) return null;
  if (repo.fork && !settings.includeForks) return null;
  const topic = (settings.topic ?? '').trim().toLowerCase();
  if (topic && (repo.topics ?? []).map((t) => t.toLowerCase()).includes(topic)) return 'topic';
  return null;
}

// ─── Languages & tech stack ────────────────────────────────────────────────
export function languagesBreakdown(languages: Record<string, number>) {
  const total = Object.values(languages).reduce((a, b) => a + (b > 0 ? b : 0), 0);
  return Object.entries(languages)
    .filter(([, bytes]) => bytes > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({
      name,
      bytes,
      percent: total ? Math.round((bytes / total) * 1000) / 10 : 0,
    }));
}

/** Main languages (≥ 5 %) + recognized topics, e.g. ["TypeScript", "React", "Docker"]. */
export function deriveTechStack(details: Pick<RepoDetails, 'repo' | 'languages'>): string[] {
  const languages = languagesBreakdown(details.languages)
    .filter((l) => l.percent >= 5)
    .slice(0, 5)
    .map((l) => languageInfo(l.name)?.name)
    .filter((n): n is string => !!n);
  const topics = (details.repo.topics ?? [])
    .map((t) => lookupTech(t)?.name)
    .filter((n): n is string => !!n);
  return uniqueNames([...languages, ...topics]).slice(0, 12);
}

// ─── Project mapping ───────────────────────────────────────────────────────
export function githubCardUrl(fullName: string): string {
  return `https://opengraph.githubassets.com/1/${fullName}`;
}

/**
 * Fields written on the project for a repository.
 * GitHub drives: title, description, content, tech stack, links, status, year.
 * Kept from the admin unless set in .portfolio.yml: subtitle, gallery, video,
 * featured, order, and an uploaded cover image.
 */
export function buildProjectData(details: RepoDetails, existing: ExistingProjectView | null, now = new Date()) {
  const { repo, config: cfg, content } = details;
  const owner = repo.owner?.login ?? repo.full_name.split('/')[0];
  const ctx: RepoContext = { owner, repo: repo.name, branch: repo.default_branch || 'HEAD', filePath: content?.path };
  const rootCtx: RepoContext = { ...ctx, filePath: '' };
  const markdown = content?.text ?? '';
  const rendered = markdown
    ? renderMarkdownWithMeta(markdown, { repo: ctx, stripLeadingH1: true })
    : { html: '', images: [] as string[] };

  const set: Record<string, unknown> = {
    title: cfg.title || (markdown && extractTitle(markdown)) || humanizeRepoName(repo.name),
    description: cfg.description || repo.description?.trim() || (markdown && extractSummary(markdown)) || '',
    techStack: cfg.techStack ? uniqueNames(cfg.techStack) : deriveTechStack(details),
    repoUrl: repo.html_url,
    status: cfg.status ?? (repo.archived ? 'archived' : 'published'),
    year: cfg.year ?? new Date(repo.created_at).getUTCFullYear(),
    source: 'github',
  };

  if (content) {
    set.longDescription = markdown;
    set.contentFormat = 'markdown';
    set.contentHtml = rendered.html;
  }

  if (!existing) set.slug = slugify(cfg.slug || repo.name) || `repo-${repo.id}`;
  else if (cfg.slug && slugify(cfg.slug) !== existing.slug) set.slug = slugify(cfg.slug);

  if (cfg.subtitle !== undefined) set.subtitle = cfg.subtitle;
  if (cfg.featured !== undefined) set.featured = cfg.featured;
  if (cfg.order !== undefined) set.order = cfg.order;
  if (cfg.gallery) set.gallery = cfg.gallery.map((g) => resolveImageUrl(g, rootCtx));
  if (cfg.video) set.demoVideo = resolveImageUrl(cfg.video, rootCtx);
  const homepage = cfg.liveUrl || (isHttpUrl(repo.homepage) ? repo.homepage.trim() : undefined);
  if (homepage) set.liveUrl = homepage;

  // Cover: explicit > admin upload (kept) > README image > GitHub social card
  let autoCover = existing?.github?.autoCover ?? '';
  if (cfg.cover) {
    set.coverImage = resolveImageUrl(cfg.cover, rootCtx);
    autoCover = '';
  } else if (!existing?.coverImage || existing.coverImage === existing.github?.autoCover) {
    autoCover = pickCoverImage(rendered.images) || githubCardUrl(repo.full_name);
    set.coverImage = autoCover;
  }

  const languages = languagesBreakdown(details.languages);
  set.github = {
    repoId: repo.id,
    fullName: repo.full_name,
    owner,
    name: repo.name,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    language: repo.language ?? languages[0]?.name ?? '',
    languages: languages.slice(0, 8),
    topics: repo.topics ?? [],
    pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : undefined,
    repoCreatedAt: new Date(repo.created_at),
    contentPath: content?.path ?? '',
    configPath: details.configPath ?? '',
    autoCover,
    autoSync: existing?.github?.autoSync ?? true,
    adopted: existing?.github?.adopted ?? (!!existing && existing.source !== 'github'),
    syncedAt: now,
  };
  return set;
}

// ─── Skills ────────────────────────────────────────────────────────────────
export interface DerivedSkill {
  name: string;
  category: SkillCategory;
  level: number;
  sourceKey: string;
  order?: number;
  icon?: string;
  visible?: boolean;
}

export const skillKey = (name: string) => `skill:${name.trim().toLowerCase()}`;

/**
 * Skills computed from the synced repositories:
 *  - languages, weighted by bytes of code (top language ≈ 95)
 *  - recognized topics / techStack entries, weighted by number of repositories
 * Explicit skills from the profile file always win (name, level, category…).
 */
export function deriveSkills(
  details: Array<Pick<RepoDetails, 'repo' | 'languages' | 'config'>>,
  options: { minLanguagePercent?: number; includeDerived?: boolean },
  explicit: SkillConfig[] = [],
): DerivedSkill[] {
  const out = new Map<string, DerivedSkill>();
  const put = (s: DerivedSkill) => {
    const key = s.name.toLowerCase();
    const prev = out.get(key);
    if (!prev || s.level > prev.level) out.set(key, prev ? { ...prev, level: s.level } : s);
  };

  if (options.includeDerived !== false) {
    const bytes = new Map<string, { name: string; category: SkillCategory; bytes: number }>();
    for (const d of details) {
      for (const [lang, b] of Object.entries(d.languages ?? {})) {
        const info = languageInfo(lang);
        if (!info || !(b > 0)) continue;
        const cur = bytes.get(info.name) ?? { ...info, bytes: 0 };
        cur.bytes += b;
        bytes.set(info.name, cur);
      }
    }
    const total = [...bytes.values()].reduce((a, l) => a + l.bytes, 0);
    const minShare = (options.minLanguagePercent ?? 2) / 100;
    const kept = [...bytes.values()].filter((l) => total > 0 && l.bytes / total >= minShare);
    const maxBytes = Math.max(0, ...kept.map((l) => l.bytes));
    for (const l of kept) {
      put({
        name: l.name,
        category: l.category,
        level: Math.round(45 + 50 * Math.sqrt(l.bytes / maxBytes)),
        sourceKey: skillKey(l.name),
      });
    }

    const counts = new Map<string, { name: string; category: SkillCategory; count: number }>();
    for (const d of details) {
      const names = new Set<string>();
      for (const t of [...(d.repo.topics ?? []), ...(d.config?.techStack ?? [])]) {
        const info = lookupTech(t);
        if (info && !names.has(info.name)) {
          names.add(info.name);
          const cur = counts.get(info.name) ?? { ...info, count: 0 };
          cur.count += 1;
          counts.set(info.name, cur);
        }
      }
    }
    const maxCount = Math.max(0, ...[...counts.values()].map((c) => c.count));
    for (const c of counts.values()) {
      put({
        name: c.name,
        category: c.category,
        level: Math.round(50 + 40 * (c.count / maxCount)),
        sourceKey: skillKey(c.name),
      });
    }
  }

  for (const s of explicit) {
    const key = s.name.toLowerCase();
    const prev = out.get(key);
    out.set(key, {
      name: s.name,
      category: s.category ?? prev?.category ?? guessCategory(s.name),
      level: s.level ?? prev?.level ?? 70,
      sourceKey: skillKey(s.name),
      ...(s.order !== undefined ? { order: s.order } : {}),
      ...(s.icon !== undefined ? { icon: s.icon } : {}),
      ...(s.visible !== undefined ? { visible: s.visible } : {}),
    });
  }
  return [...out.values()].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
}

// ─── Experiences / education keys ──────────────────────────────────────────
const month = (d: Date) => d.toISOString().slice(0, 7);

export function experienceKey(e: Pick<ExperienceConfig, 'company' | 'title' | 'startDate'>): string {
  return `exp:${slugify(e.company)}:${slugify(e.title)}:${month(e.startDate)}`;
}

export function educationKey(e: Pick<EducationConfig, 'school' | 'degree' | 'startDate'>): string {
  return `edu:${slugify(e.school)}:${slugify(e.degree)}:${month(e.startDate)}`;
}
