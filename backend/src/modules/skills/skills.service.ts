import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument, SKILL_CATEGORIES } from './skill.schema';
import { CreateSkillDto, UpdateSkillDto } from './skill.dto';
import { parseBooleanQuery } from '../../common/transformers';

@Injectable()
export class SkillsService {
  constructor(@InjectModel(Skill.name) private model: Model<SkillDocument>) {}

  findAll(query: { category?: string; visible?: string } = {}) {
    const filter: Record<string, unknown> = {};
    if (query.category && (SKILL_CATEGORIES as readonly string[]).includes(query.category)) {
      filter.category = query.category;
    }
    const visible = parseBooleanQuery(query.visible);
    if (visible !== undefined) filter.visible = visible;
    return this.model.find(filter).sort({ category: 1, order: 1, level: -1 }).lean().exec();
  }
  async findOne(id: string) {
    const s = await this.model.findById(id).lean().exec();
    if (!s) throw new NotFoundException('Compétence introuvable');
    return s;
  }
  create(dto: CreateSkillDto) { return this.model.create(dto); }
  async update(id: string, dto: UpdateSkillDto) {
    const s = await this.model.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).lean().exec();
    if (!s) throw new NotFoundException('Compétence introuvable');
    return s;
  }
  async remove(id: string) {
    const s = await this.model.findByIdAndDelete(id).exec();
    if (!s) throw new NotFoundException('Compétence introuvable');
    return { deleted: true };
  }
}
