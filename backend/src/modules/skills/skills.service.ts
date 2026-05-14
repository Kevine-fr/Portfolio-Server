import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument } from './skill.schema';
import { CreateSkillDto, UpdateSkillDto } from './skill.dto';

@Injectable()
export class SkillsService {
  constructor(@InjectModel(Skill.name) private model: Model<SkillDocument>) {}
  findAll(query: any = {}) {
    const filter: any = {};
    if (query.category) filter.category = query.category;
    if (query.visible !== undefined) filter.visible = query.visible === 'true';
    return this.model.find(filter).sort({ category: 1, order: 1, level: -1 }).exec();
  }
  async findOne(id: string) {
    const s = await this.model.findById(id).exec();
    if (!s) throw new NotFoundException();
    return s;
  }
  create(dto: CreateSkillDto) { return this.model.create(dto); }
  async update(id: string, dto: UpdateSkillDto) {
    const s = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!s) throw new NotFoundException();
    return s;
  }
  async remove(id: string) {
    const s = await this.model.findByIdAndDelete(id).exec();
    if (!s) throw new NotFoundException();
    return { deleted: true };
  }
}
