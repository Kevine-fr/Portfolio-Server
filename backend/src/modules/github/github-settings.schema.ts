import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GithubSettingsDocument = GithubSettings & Document;

/** Singleton (kind = "default") holding the GitHub sync configuration. */
@Schema({ timestamps: true, collection: 'github_settings' })
export class GithubSettings {
  @Prop({ default: 'default', unique: true }) kind: string;

  /** GitHub login whose public repositories feed the portfolio. */
  @Prop({ default: '', trim: true }) username: string;
  /** Repositories with this topic are included automatically ("" = disabled). */
  @Prop({ default: 'portfolio', trim: true, lowercase: true }) topic: string;
  /** Repository names explicitly selected in the admin (lowercase). */
  @Prop({ type: [String], default: [] }) selectedRepos: string[];
  /** Repository names explicitly excluded (wins over the topic). */
  @Prop({ type: [String], default: [] }) excludedRepos: string[];
  @Prop({ default: false }) includeForks: boolean;

  @Prop({ default: true }) syncProjects: boolean;
  /** Derive skills from the languages / topics of the synced repositories. */
  @Prop({ default: true }) syncSkills: boolean;
  /** Read about / skills / experiences / education from the profile repository. */
  @Prop({ default: true }) syncProfile: boolean;
  /** Profile repository name ("" = the special <username>/<username> repository). */
  @Prop({ default: '', trim: true }) profileRepo: string;
  /** Languages below this share (in %) are not turned into skills. */
  @Prop({ default: 2, min: 0, max: 50 }) minLanguagePercent: number;

  @Prop({ default: true }) autoSync: boolean;
  @Prop({ default: 60, min: 15, max: 1440 }) syncIntervalMinutes: number;

  @Prop() lastSyncAt: Date;
  @Prop({ type: Object }) lastSyncReport: Record<string, unknown>;
}

export const GithubSettingsSchema = SchemaFactory.createForClass(GithubSettings);
