import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './user.schema';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async onModuleInit() {
    // Bootstrap : cree l'admin par defaut si table vide
    const count = await this.userModel.estimatedDocumentCount();
    if (count === 0) {
      const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
      const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
      if (email && password) {
        await this.create({ email, password, name: 'Admin', role: 'admin' });
        // eslint-disable-next-line no-console
        console.log(`[bootstrap] Admin user created: ${email}`);
      }
    }
  }

  async findAll() {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmailWithPassword(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+password').exec();
  }

  async create(dto: CreateUserDto) {
    const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
    if (exists) throw new ConflictException('Email already in use');
    const hash = await bcrypt.hash(dto.password, 10);
    const created = await this.userModel.create({ ...dto, password: hash });
    const { password, ...rest } = created.toObject();
    return rest;
  }

  async update(id: string, dto: UpdateUserDto) {
    const update: any = { ...dto };
    if (dto.password) update.password = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return { deleted: true };
  }
}
