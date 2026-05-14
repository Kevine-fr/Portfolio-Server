import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './project.schema';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';

@Injectable()
export class ProjectsService {
  constructor(@InjectModel(Project.name) private model: Model<ProjectDocument>) {}

  findAll(query: any = {}) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.featured !== undefined) filter.featured = query.featured === 'true';
    return this.model.find(filter).populate('tags').sort({ order: 1, createdAt: -1 }).exec();
  }
  async findOne(id: string) {
    const p = await this.model.findById(id).populate('tags').exec();
    if (!p) throw new NotFoundException();
    return p;
  }
  async findBySlug(slug: string) {
    const p = await this.model.findOne({ slug }).populate('tags').exec();
    if (!p) throw new NotFoundException();
    return p;
  }
  create(dto: CreateProjectDto) { return this.model.create(dto); }
  async update(id: string, dto: UpdateProjectDto) {
    const p = await this.model.findByIdAndUpdate(id, dto, { new: true }).populate('tags').exec();
    if (!p) throw new NotFoundException();
    return p;
  }
  async remove(id: string) {
    const p = await this.model.findByIdAndDelete(id).exec();
    if (!p) throw new NotFoundException();
    return { deleted: true };
  }
}
