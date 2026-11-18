import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument, PROJECT_STATUSES } from './project.schema';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { parseBooleanQuery } from '../../common/transformers';
import { renderMarkdown } from '../github/markdown';

export interface ProjectQuery {
  status?: string;
  featured?: string;
  source?: string;
  /** "true": lighter payload for listings (no long content). */
  summary?: string;
}

@Injectable()
export class ProjectsService {
  constructor(@InjectModel(Project.name) private model: Model<ProjectDocument>) {}

  findAll(query: ProjectQuery = {}) {
    const filter: Record<string, unknown> = {};
    if (query.status && (PROJECT_STATUSES as readonly string[]).includes(query.status)) {
      filter.status = query.status;
    }
    const featured = parseBooleanQuery(query.featured);
    if (featured !== undefined) filter.featured = featured;
    if (query.source === 'github' || query.source === 'manual') {
      filter.source = query.source === 'manual' ? { $ne: 'github' } : 'github';
    }
    // contentHtml is only needed on the detail page; listings stay light.
    const projection = parseBooleanQuery(query.summary)
      ? '-longDescription -contentHtml'
      : '-contentHtml';
    return this.model
      .find(filter)
      .select(projection)
      .populate('tags')
      .sort({ order: 1, createdAt: -1 })
      .lean()
      .exec();
  }

  async findOne(id: string) {
    const p = await this.model.findById(id).populate('tags').lean().exec();
    if (!p) throw new NotFoundException('Projet introuvable');
    return p;
  }

  async findBySlug(slug: string) {
    const p = await this.model
      .findOne({ slug: String(slug).toLowerCase().trim() })
      .populate('tags')
      .lean()
      .exec();
    if (!p) throw new NotFoundException('Projet introuvable');
    return p;
  }

  create(dto: CreateProjectDto) {
    const data: Record<string, unknown> = { ...dto };
    data.contentHtml =
      dto.contentFormat === 'markdown' && dto.longDescription ? renderMarkdown(dto.longDescription) : '';
    return this.model.create(data);
  }

  async update(id: string, dto: UpdateProjectDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.longDescription !== undefined || dto.contentFormat !== undefined) {
      const current = await this.model.findById(id).select('longDescription contentFormat').lean().exec();
      if (!current) throw new NotFoundException('Projet introuvable');
      const format = dto.contentFormat ?? current.contentFormat;
      const source = dto.longDescription ?? current.longDescription ?? '';
      data.contentHtml = format === 'markdown' && source ? renderMarkdown(source) : '';
    }
    const p = await this.model
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('tags')
      .lean()
      .exec();
    if (!p) throw new NotFoundException('Projet introuvable');
    return p;
  }

  async remove(id: string) {
    const p = await this.model.findByIdAndDelete(id).exec();
    if (!p) throw new NotFoundException('Projet introuvable');
    return { deleted: true };
  }
}
