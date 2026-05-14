import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from './tag.schema';
import { CreateTagDto, UpdateTagDto } from './tag.dto';

@Injectable()
export class TagsService {
  constructor(@InjectModel(Tag.name) private model: Model<TagDocument>) {}
  findAll() { return this.model.find().sort({ name: 1 }).exec(); }
  async findOne(id: string) {
    const x = await this.model.findById(id).exec();
    if (!x) throw new NotFoundException(); return x;
  }
  create(dto: CreateTagDto) { return this.model.create(dto); }
  async update(id: string, dto: UpdateTagDto) {
    const x = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!x) throw new NotFoundException(); return x;
  }
  async remove(id: string) {
    const x = await this.model.findByIdAndDelete(id).exec();
    if (!x) throw new NotFoundException(); return { deleted: true };
  }
}
