import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Education, EducationDocument } from './education.schema';
import { CreateEducationDto, UpdateEducationDto } from './education.dto';

@Injectable()
export class EducationService {
  constructor(@InjectModel(Education.name) private model: Model<EducationDocument>) {}
  findAll() { return this.model.find().sort({ order: 1, startDate: -1 }).exec(); }
  async findOne(id: string) {
    const x = await this.model.findById(id).exec();
    if (!x) throw new NotFoundException(); return x;
  }
  create(dto: CreateEducationDto) { return this.model.create(dto); }
  async update(id: string, dto: UpdateEducationDto) {
    const x = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!x) throw new NotFoundException(); return x;
  }
  async remove(id: string) {
    const x = await this.model.findByIdAndDelete(id).exec();
    if (!x) throw new NotFoundException(); return { deleted: true };
  }
}
