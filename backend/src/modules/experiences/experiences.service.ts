import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Experience, ExperienceDocument } from './experience.schema';
import { CreateExperienceDto, UpdateExperienceDto } from './experience.dto';

@Injectable()
export class ExperiencesService {
  constructor(@InjectModel(Experience.name) private model: Model<ExperienceDocument>) {}
  findAll() { return this.model.find().sort({ order: 1, startDate: -1 }).exec(); }
  async findOne(id: string) {
    const x = await this.model.findById(id).exec();
    if (!x) throw new NotFoundException();
    return x;
  }
  create(dto: CreateExperienceDto) { return this.model.create(dto); }
  async update(id: string, dto: UpdateExperienceDto) {
    const x = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!x) throw new NotFoundException();
    return x;
  }
  async remove(id: string) {
    const x = await this.model.findByIdAndDelete(id).exec();
    if (!x) throw new NotFoundException();
    return { deleted: true };
  }
}
