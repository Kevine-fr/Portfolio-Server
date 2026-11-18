import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CONTENT_SOURCES } from '../../common/source';

export type ProjectDocument = Project & Document;

export const PROJECT_STATUSES = ['draft', 'published', 'archived'] as const;
export const CONTENT_FORMATS = ['text', 'markdown'] as const;

@Schema({ _id: false })
export class ProjectLanguage {
  @Prop({ required: true }) name: string;
  @Prop({ default: 0 }) bytes: number;
  @Prop({ default: 0 }) percent: number;
}
export const ProjectLanguageSchema = SchemaFactory.createForClass(ProjectLanguage);

/** Link between a project and the GitHub repository it is synced from. */
@Schema({ _id: false })
export class GithubLink {
  @Prop({ required: true }) repoId: number;
  @Prop({ required: true }) fullName: string;
  @Prop() owner: string;
  @Prop() name: string;
  @Prop() htmlUrl: string;
  @Prop() defaultBranch: string;
  @Prop({ default: 0 }) stars: number;
  @Prop({ default: 0 }) forks: number;
  @Prop() language: string;
  @Prop({ type: [ProjectLanguageSchema], default: [] }) languages: ProjectLanguage[];
  @Prop({ type: [String], default: [] }) topics: string[];
  @Prop() pushedAt: Date;
  @Prop() repoCreatedAt: Date;
  /** Markdown file used for the detail page (README.md by default). */
  @Prop() contentPath: string;
  /** `.portfolio.yml` (or json) found in the repository, if any. */
  @Prop() configPath: string;
  /** Cover picked automatically (README image / GitHub card) — replaced on next sync. */
  @Prop() autoCover: string;
  /** false = detached: kept in the portfolio but no longer overwritten by the sync. */
  @Prop({ default: true }) autoSync: boolean;
  /** true when the project existed before and was linked by its repoUrl. */
  @Prop({ default: false }) adopted: boolean;
  @Prop() syncedAt: Date;
}
export const GithubLinkSchema = SchemaFactory.createForClass(GithubLink);

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ required: true, trim: true, lowercase: true, unique: true }) slug: string;
  @Prop({ trim: true }) subtitle: string;
  @Prop({ trim: true }) description: string;
  @Prop({ default: '' }) longDescription: string;
  /** How `longDescription` is written. Markdown is rendered to `contentHtml`. */
  @Prop({ default: 'text', enum: CONTENT_FORMATS }) contentFormat: string;
  /** Sanitized HTML rendered from the markdown content (never user-supplied). */
  @Prop({ default: '' }) contentHtml: string;

  @Prop({ default: [] }) techStack: string[];
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }], default: [] }) tags: Types.ObjectId[];

  @Prop() coverImage: string;
  @Prop({ default: [] }) gallery: string[];
  @Prop() demoVideo: string;

  @Prop() liveUrl: string;
  @Prop() repoUrl: string;

  @Prop({ default: false }) featured: boolean;
  @Prop({ default: 0 }) order: number;
  @Prop({ default: 'published', enum: PROJECT_STATUSES }) status: string;

  @Prop() year: number;

  @Prop({ default: 'manual', enum: CONTENT_SOURCES }) source: string;
  @Prop({ type: GithubLinkSchema, default: undefined }) github?: GithubLink;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ 'github.repoId': 1 }, { unique: true, sparse: true });
ProjectSchema.index({ order: 1, createdAt: -1 });
