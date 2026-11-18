import {
  BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from '../projects/project.schema';
import { Skill, SkillDocument } from '../skills/skill.schema';
import { Experience, ExperienceDocument } from '../experiences/experience.schema';
import { Education, EducationDocument } from '../education/education.schema';
import { AboutService } from '../about/about.service';
import { mapMongoError } from '../../common/mongo-errors';
import { GithubApiError, GithubClient, mapLimit } from './github.client';
import { GithubSettingsData, GithubSettingsService } from './github-settings.service';
import { emptyReport, GithubRepo, SyncCounters, SyncReport } from './github.types';
import {
  buildProjectData, deriveSkills, educationKey, experienceKey, normalizeRepoUrl, RepoDetails, repoInclusion,
} from './github-mapper';
import {
  findConfigFile, normalizeProfileConfig, normalizeProjectConfig, parseConfigText, ProfileConfig, ProjectConfig,
} from './repo-config';
import { resolveImageUrl } from './markdown';

const SCHEDULER_TICK_MS = 5 * 60_000;
const FIRST_TICK_DELAY_MS = 30_000;
const FETCH_CONCURRENCY = 4;

const errorMessage = (err: unknown) => mapMongoError(err)?.message ?? (err as any)?.message ?? String(err);

/** Deep-ish equality good enough to skip no-op updates (dates, arrays, ObjectIds). */
function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown => {
    if (v === undefined || v === null || v === '') return null;
    if (v instanceof Date) return v.getTime();
    if (v instanceof Types.ObjectId) return v.toString();
    if (Array.isArray(v)) return v.map(norm);
    return v;
  };
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

function changedFields(prev: Record<string, any>, next: Record<string, unknown>): boolean {
  return Object.entries(next).some(([k, v]) => !sameValue(prev[k], v));
}

@Injectable()
export class GithubSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GithubSyncService.name);
  private running: Promise<SyncReport> | null = null;
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly client: GithubClient,
    private readonly settingsService: GithubSettingsService,
    private readonly about: AboutService,
    @InjectModel(Project.name) private readonly projects: Model<ProjectDocument>,
    @InjectModel(Skill.name) private readonly skills: Model<SkillDocument>,
    @InjectModel(Experience.name) private readonly experiences: Model<ExperienceDocument>,
    @InjectModel(Education.name) private readonly education: Model<EducationDocument>,
  ) {}

  // ─── Scheduler ──────────────────────────────────────────────────────────
  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.GITHUB_SYNC_DISABLED === '1') return;
    const first = setTimeout(() => this.tick(), FIRST_TICK_DELAY_MS);
    const every = setInterval(() => this.tick(), SCHEDULER_TICK_MS);
    first.unref?.();
    every.unref?.();
    this.timers.push(first, every);
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  isRunning() {
    return this.running !== null;
  }

  /** Runs a scheduled sync when auto-sync is on and the interval has elapsed. */
  async tick(now = Date.now()): Promise<SyncReport | null> {
    try {
      const s = await this.settingsService.get();
      if (!s.autoSync || this.running || !this.settingsService.effectiveUsername(s)) return null;
      const last = s.lastSyncAt ? new Date(s.lastSyncAt).getTime() : 0;
      if (now - last < (s.syncIntervalMinutes || 60) * 60_000) return null;
      return await this.sync('schedule');
    } catch (err) {
      this.logger.error(`Synchronisation GitHub planifiée en échec : ${errorMessage(err)}`);
      return null;
    }
  }

  /** Starts a sync (or joins the one already running). */
  sync(trigger: SyncReport['trigger'] = 'manual'): Promise<SyncReport> {
    if (!this.running) {
      this.running = this.runSync(trigger).finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  // ─── Admin helpers ──────────────────────────────────────────────────────
  async listRepos() {
    const settings = await this.settingsService.get();
    const username = this.requireUsername(settings);
    const repos = await this.client.listUserRepos(username);
    const profileRepo = settings.profileRepo || username;
    const linked = await this.projects
      .find({ 'github.repoId': { $in: repos.map((r) => r.id) } })
      .select('_id slug title status github.repoId github.autoSync')
      .lean()
      .exec();
    const byRepo = new Map(linked.map((p: any) => [p.github?.repoId, p]));
    return {
      username,
      topic: settings.topic,
      tokenConfigured: this.client.hasToken(),
      rateLimit: this.client.getLastRateLimit(),
      repos: repos.map((r) => {
        const project: any = byRepo.get(r.id);
        const name = r.name.toLowerCase();
        return {
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          htmlUrl: r.html_url,
          homepage: r.homepage,
          language: r.language,
          stars: r.stargazers_count,
          forks: r.forks_count,
          topics: r.topics ?? [],
          fork: r.fork,
          archived: r.archived,
          pushedAt: r.pushed_at,
          isProfileRepo: name === profileRepo.toLowerCase(),
          inclusion: repoInclusion(r, settings, profileRepo),
          selected: (settings.selectedRepos ?? []).includes(name),
          excluded: (settings.excludedRepos ?? []).includes(name),
          project: project
            ? { id: String(project._id), slug: project.slug, title: project.title, status: project.status, autoSync: project.github?.autoSync !== false }
            : null,
        };
      }),
    };
  }

  async setProjectAutoSync(projectId: string, autoSync: boolean) {
    const res = await this.projects
      .findOneAndUpdate({ _id: projectId, source: 'github' }, { $set: { 'github.autoSync': autoSync } }, { new: true })
      .select('_id slug title github')
      .lean()
      .exec();
    if (!res) throw new NotFoundException('Projet GitHub introuvable');
    return res;
  }

  async status() {
    const settings = await this.settingsService.get();
    return {
      running: this.isRunning(),
      username: this.settingsService.effectiveUsername(settings),
      tokenConfigured: this.client.hasToken(),
      lastSyncAt: settings.lastSyncAt ?? null,
      lastSyncReport: settings.lastSyncReport ?? null,
      rateLimit: await this.client.fetchRateLimit(),
    };
  }

  // ─── Sync ───────────────────────────────────────────────────────────────
  private requireUsername(settings: GithubSettingsData): string {
    const username = this.settingsService.effectiveUsername(settings);
    if (!username) throw new BadRequestException("Renseignez d'abord votre identifiant GitHub");
    return username;
  }

  private async runSync(trigger: SyncReport['trigger']): Promise<SyncReport> {
    const settings = await this.settingsService.get();
    const username = this.requireUsername(settings);
    const report = emptyReport(trigger, username);
    const started = Date.now();
    this.logger.log(`Synchronisation GitHub (${trigger}) pour « ${username} »…`);

    try {
      const repos = await this.client.listUserRepos(username);
      report.reposScanned = repos.length;
      const profileRepo = settings.profileRepo || username;
      const candidates = repos.filter((r) => repoInclusion(r, settings, profileRepo) !== null);

      const failedRepoIds = new Set<number>();
      let quotaExceeded = false;
      const fetched = await mapLimit(candidates, FETCH_CONCURRENCY, async (repo) => {
        if (quotaExceeded) {
          failedRepoIds.add(repo.id);
          return null;
        }
        try {
          return await this.fetchDetails(repo);
        } catch (err) {
          failedRepoIds.add(repo.id);
          if (err instanceof GithubApiError && err.rateLimited) {
            // One clear message instead of one error per remaining repository
            if (!quotaExceeded) report.errors.push(errorMessage(err));
            quotaExceeded = true;
          } else {
            report.errors.push(`${repo.name} : ${errorMessage(err)}`);
          }
          return null;
        }
      });
      if (quotaExceeded) {
        report.warnings.push(`${failedRepoIds.size} dépôt(s) non synchronisé(s) faute de quota : nouvelle tentative au prochain passage.`);
      }

      const details: RepoDetails[] = [];
      for (const d of fetched) {
        if (!d) continue;
        report.warnings.push(...d.warnings);
        if (d.config.hidden) report.projects.skipped.push({ repo: d.repo.name, reason: 'masqué (hidden: true)' });
        else details.push(d);
      }
      report.reposIncluded = details.length;

      if (settings.syncProjects) await this.syncProjects(details, failedRepoIds, report);

      let profile: ProfileConfig | null = null;
      let profileOk = true;
      if (settings.syncProfile) {
        try {
          profile = await this.syncProfile(username, profileRepo, report);
        } catch (err) {
          profileOk = false;
          report.errors.push(`Profil ${username}/${profileRepo} : ${errorMessage(err)}`);
        }
      }

      await this.syncSkills(details, settings, profile?.skills ?? [], report, {
        allowRemoval: failedRepoIds.size === 0 && profileOk,
      });
    } catch (err) {
      report.errors.push(errorMessage(err));
      if (err instanceof GithubApiError && err.rateLimited) report.warnings.push('Synchronisation interrompue (quota GitHub).');
    } finally {
      report.ok = report.errors.length === 0;
      report.finishedAt = new Date().toISOString();
      report.durationMs = Date.now() - started;
      report.rateLimit = this.client.getLastRateLimit();
      await this.settingsService
        .saveReport(report as unknown as Record<string, unknown>)
        .catch((err) => this.logger.error(`Rapport non enregistré : ${errorMessage(err)}`));
    }

    this.logger.log(
      `GitHub sync terminée en ${report.durationMs} ms — projets +${report.projects.created.length} ~${report.projects.updated.length} -${report.projects.removed.length}, erreurs: ${report.errors.length}`,
    );
    return report;
  }

  /** README / .portfolio.yml / languages of one repository. */
  async fetchDetails(repo: GithubRepo): Promise<RepoDetails> {
    const owner = repo.owner?.login ?? repo.full_name.split('/')[0];
    const name = repo.name;
    const warnings: string[] = [];
    const [root, languages] = await Promise.all([
      this.client.listRootFiles(owner, name),
      this.client.getLanguages(owner, name),
    ]);

    let config: ProjectConfig = {};
    const configPath = findConfigFile(root.filter((e) => e.type === 'file').map((e) => e.name));
    if (configPath) {
      const text = await this.client.getFileText(owner, name, configPath);
      if (text !== null) {
        try {
          config = normalizeProjectConfig(parseConfigText(text, configPath), (m) =>
            warnings.push(`${name}/${configPath} : ${m}`),
          );
        } catch (err) {
          warnings.push(`${name} : ${errorMessage(err)}`);
        }
      }
    }

    let content: RepoDetails['content'] = null;
    if (!config.hidden && config.content) {
      const path = config.content.replace(/^\.?\/+/, '');
      const text = await this.client.getFileText(owner, name, path);
      if (text !== null) content = { path, text };
      else warnings.push(`${name} : fichier « ${config.content} » introuvable, README utilisé`);
    }
    if (!config.hidden && !content) content = await this.client.getReadme(owner, name);

    return { repo, config, configPath, content, languages, warnings };
  }

  private async syncProjects(details: RepoDetails[], failedRepoIds: Set<number>, report: SyncReport) {
    const fields = '_id slug title source coverImage repoUrl github';
    const linked: any[] = await this.projects.find({ source: 'github' }).select(fields).lean().exec();
    const manual: any[] = await this.projects
      .find({ source: { $ne: 'github' }, repoUrl: { $nin: [null, ''] } })
      .select(fields)
      .lean()
      .exec();
    const slugs = new Set<string>(
      ((await this.projects.find().select('slug').lean().exec()) as any[]).map((p) => p.slug),
    );

    const byRepoId = new Map(linked.filter((p) => p.github?.repoId).map((p) => [p.github.repoId, p]));
    const byFullName = new Map(linked.filter((p) => p.github?.fullName).map((p) => [p.github.fullName.toLowerCase(), p]));
    const manualByUrl = new Map(manual.map((p) => [normalizeRepoUrl(p.repoUrl), p]));
    const includedIds = new Set<number>();

    for (const d of details) {
      includedIds.add(d.repo.id);
      const existing =
        byRepoId.get(d.repo.id) ??
        byFullName.get(d.repo.full_name.toLowerCase()) ??
        manualByUrl.get(normalizeRepoUrl(d.repo.html_url)) ??
        null;
      if (existing?.github?.autoSync === false) {
        report.projects.skipped.push({ repo: d.repo.name, reason: 'synchronisation désactivée pour ce projet' });
        continue;
      }

      const data = buildProjectData(d, existing);
      if (typeof data.slug === 'string') data.slug = this.uniqueSlug(data.slug, slugs, existing?.slug);
      try {
        if (existing) {
          await this.projects.updateOne({ _id: existing._id }, { $set: data }, { runValidators: true }).exec();
          report.projects.updated.push(String(data.title));
        } else {
          await this.projects.create(data);
          report.projects.created.push(String(data.title));
        }
      } catch (err) {
        report.errors.push(`${d.repo.name} : ${errorMessage(err)}`);
      }
    }

    // Repositories no longer selected (or deleted / hidden on GitHub)
    for (const p of linked) {
      const repoId = p.github?.repoId;
      if (!repoId || includedIds.has(repoId) || failedRepoIds.has(repoId)) continue;
      if (p.github?.autoSync === false) continue; // detached projects are left alone
      try {
        if (p.github?.adopted) {
          // Existed before the GitHub link: keep it as a plain manual project
          // (re-selecting the repository later links it again through its repoUrl)
          await this.projects
            .updateOne({ _id: p._id }, { $set: { source: 'manual' }, $unset: { github: 1 } })
            .exec();
          report.projects.detached.push(p.title);
        } else {
          await this.projects.deleteOne({ _id: p._id }).exec();
          report.projects.removed.push(p.title);
        }
      } catch (err) {
        report.errors.push(`${p.title} : ${errorMessage(err)}`);
      }
    }
  }

  private uniqueSlug(base: string, used: Set<string>, current?: string): string {
    if (base === current) return base;
    let slug = base;
    for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
    if (current) used.delete(current);
    used.add(slug);
    return slug;
  }

  /** about / experiences / education / skills from <user>/<profileRepo>/.portfolio.yml */
  private async syncProfile(owner: string, repo: string, report: SyncReport): Promise<ProfileConfig | null> {
    const root = await this.client.listRootFiles(owner, repo);
    const file = findConfigFile(root.filter((e) => e.type === 'file').map((e) => e.name));
    if (!file) return null;
    const text = await this.client.getFileText(owner, repo, file);
    if (text === null) return null;
    const profile = normalizeProfileConfig(parseConfigText(text, file), (m) =>
      report.warnings.push(`${repo}/${file} : ${m}`),
    );
    const ctx = { owner, repo, branch: 'HEAD', filePath: '' };

    if (profile.about && Object.keys(profile.about).length) {
      const about = { ...profile.about };
      if (about.cvUrl) about.cvUrl = resolveImageUrl(about.cvUrl, ctx);
      await this.about.update(about as any);
      report.about = true;
    }
    if (profile.experiences) {
      await this.reconcile(
        this.experiences,
        profile.experiences.map((e) => ({ ...e, source: 'github', sourceKey: experienceKey(e) })),
        report.experiences,
      );
    }
    if (profile.education) {
      await this.reconcile(
        this.education,
        profile.education.map((e) => ({ ...e, source: 'github', sourceKey: educationKey(e) })),
        report.education,
      );
    }
    return profile;
  }

  private async syncSkills(
    details: RepoDetails[],
    settings: GithubSettingsData,
    explicit: ProfileConfig['skills'],
    report: SyncReport,
    opts: { allowRemoval: boolean },
  ) {
    const desired = deriveSkills(
      details,
      { minLanguagePercent: settings.minLanguagePercent, includeDerived: settings.syncSkills },
      settings.syncProfile ? explicit ?? [] : [],
    ).map((s, i) => ({ ...s, order: s.order ?? i }));

    const existing: any[] = await this.skills.find().lean().exec();
    const manualNames = new Set(existing.filter((s) => s.source !== 'github').map((s) => s.name.toLowerCase()));
    const synced = existing.filter((s) => s.source === 'github');
    const items = desired
      .filter((s) => !manualNames.has(s.name.toLowerCase())) // never shadow a skill typed in the admin
      .map((s) => {
        const prev = synced.find((x) => x.sourceKey === s.sourceKey);
        // order / visibility / icon edited in the admin are kept unless set in the profile file
        const keepAdmin = (k: 'order' | 'visible' | 'icon') =>
          prev && !explicit?.some((e) => e.name.toLowerCase() === s.name.toLowerCase() && e[k] !== undefined);
        return {
          name: s.name,
          category: s.category,
          level: s.level,
          source: 'github',
          sourceKey: s.sourceKey,
          ...(keepAdmin('order') ? {} : { order: s.order }),
          ...(keepAdmin('visible') || s.visible === undefined ? {} : { visible: s.visible }),
          ...(keepAdmin('icon') || s.icon === undefined ? {} : { icon: s.icon }),
        };
      });
    await this.reconcile(this.skills, items, report.skills, { allowRemoval: opts.allowRemoval, existing: synced });
  }

  /** Upserts synced items by sourceKey and removes the ones that disappeared. */
  private async reconcile(
    model: Model<any>,
    items: Array<Record<string, unknown> & { sourceKey: string }>,
    counters: SyncCounters,
    opts: { allowRemoval?: boolean; existing?: any[] } = {},
  ) {
    const existing: any[] = opts.existing ?? (await model.find({ source: 'github' }).lean().exec());
    const byKey = new Map(existing.map((e) => [e.sourceKey, e]));
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.sourceKey)) continue;
      seen.add(item.sourceKey);
      const prev = byKey.get(item.sourceKey);
      if (!prev) {
        await model.create(item);
        counters.created++;
      } else if (changedFields(prev, item)) {
        await model.updateOne({ _id: prev._id }, { $set: item }).exec();
        counters.updated++;
      }
    }
    if (opts.allowRemoval === false) return;
    const stale = existing.filter((e) => !seen.has(e.sourceKey)).map((e) => e._id);
    if (stale.length) {
      await model.deleteMany({ _id: { $in: stale } }).exec();
      counters.removed += stale.length;
    }
  }
}
