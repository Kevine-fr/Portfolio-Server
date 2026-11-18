import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from './tag.schema';
import { Project, ProjectDocument } from '../projects/project.schema';
import { CreateTagDto, UpdateTagDto } from './tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name) private model: Model<TagDocument>,
    @InjectModel(Project.name) private projects: Model<ProjectDocument>,
  ) {}
  findAll() { return this.model.find().sort({ name: 1 }).lean().exec(); }
  async findOne(id: string) {
    const x = await this.model.findById(id).lean().exec();
    if (!x) throw new NotFoundException('Étiquette introuvable');
    return x;
  }
  create(dto: CreateTagDto) { return this.model.create(dto); }
  async update(id: string, dto: UpdateTagDto) {
    const x = await this.model.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).lean().exec();
    if (!x) throw new NotFoundException('Étiquette introuvable');
    return x;
  }
  async remove(id: string) {
    const x = await this.model.findByIdAndDelete(id).exec();
    if (!x) throw new NotFoundException('Étiquette introuvable');
    // The admin promises the tag is removed from every project using it
    await this.projects.updateMany({ tags: x._id }, { $pull: { tags: x._id } }).exec();
    return { deleted: true };
  }
}
