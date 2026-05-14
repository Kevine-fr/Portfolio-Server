import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument } from './contact.schema';
import { CreateContactDto, UpdateContactDto } from './contact.dto';

@Injectable()
export class ContactsService {
  constructor(@InjectModel(Contact.name) private model: Model<ContactDocument>) {}

  findAll(query: any = {}) {
    const filter: any = {};
    if (query.read !== undefined) filter.read = query.read === 'true';
    if (query.archived !== undefined) filter.archived = query.archived === 'true';
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }
  async findOne(id: string) {
    const c = await this.model.findById(id).exec();
    if (!c) throw new NotFoundException(); return c;
  }
  create(dto: CreateContactDto, meta: { ip?: string; userAgent?: string } = {}) {
    return this.model.create({ ...dto, ...meta });
  }
  async update(id: string, dto: UpdateContactDto) {
    const c = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!c) throw new NotFoundException(); return c;
  }
  async remove(id: string) {
    const c = await this.model.findByIdAndDelete(id).exec();
    if (!c) throw new NotFoundException(); return { deleted: true };
  }
  countUnread() { return this.model.countDocuments({ read: false, archived: false }); }
}
