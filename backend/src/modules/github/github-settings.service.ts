import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GithubSettings, GithubSettingsDocument } from './github-settings.schema';
import { UpdateGithubSettingsDto } from './github.dto';

export type GithubSettingsData = GithubSettings & { _id?: unknown; updatedAt?: Date };

const normalizeNames = (names: string[] = []) =>
  [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))];

@Injectable()
export class GithubSettingsService {
  constructor(@InjectModel(GithubSettings.name) private readonly model: Model<GithubSettingsDocument>) {}

  /** Settings singleton, created on first access (username defaults to GITHUB_USERNAME). */
  async get(): Promise<GithubSettingsData> {
    const doc = await this.model
      .findOneAndUpdate(
        { kind: 'default' },
        { $setOnInsert: { username: process.env.GITHUB_USERNAME?.trim() || '' } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec();
    return doc as GithubSettingsData;
  }

  /** Effective GitHub login (admin setting, else GITHUB_USERNAME). */
  effectiveUsername(settings: Pick<GithubSettings, 'username'>): string {
    return (settings.username || process.env.GITHUB_USERNAME || '').trim();
  }

  async update(dto: UpdateGithubSettingsDto): Promise<GithubSettingsData> {
    await this.get();
    const set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      set[key] = key === 'selectedRepos' || key === 'excludedRepos' ? normalizeNames(value as string[]) : value;
    }
    if (typeof set.topic === 'string') set.topic = (set.topic as string).toLowerCase();
    return (await this.model
      .findOneAndUpdate({ kind: 'default' }, { $set: set }, { new: true, runValidators: true })
      .lean()
      .exec()) as GithubSettingsData;
  }

  /** Include / exclude one repository (atomic, independent of the topic). */
  async setRepoIncluded(repoName: string, included: boolean): Promise<GithubSettingsData> {
    await this.get();
    const name = repoName.trim().toLowerCase();
    const update = included
      ? { $addToSet: { selectedRepos: name }, $pull: { excludedRepos: name } }
      : { $addToSet: { excludedRepos: name }, $pull: { selectedRepos: name } };
    return (await this.model
      .findOneAndUpdate({ kind: 'default' }, update, { new: true })
      .lean()
      .exec()) as GithubSettingsData;
  }

  async saveReport(report: Record<string, unknown>, at = new Date()) {
    await this.model
      .updateOne({ kind: 'default' }, { $set: { lastSyncAt: at, lastSyncReport: report } })
      .exec();
  }
}
