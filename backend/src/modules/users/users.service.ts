import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './user.schema';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async onModuleInit() {
    // Bootstrap : cree l'admin par defaut si table vide
    const count = await this.userModel.estimatedDocumentCount();
    if (count === 0) {
      const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
      const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
      if (email && password) {
        await this.create({ email, password, name: 'Admin', role: 'admin' });
        this.logger.log(`[bootstrap] Admin user created: ${email}`);
      }
    }
  }

  findAll() {
    return this.userModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  /** Lookup used by the JWT strategy: never throws, null when unusable. */
  async findActiveById(id: string) {
    if (!isValidObjectId(id)) return null;
    const user = await this.userModel.findById(id).lean().exec();
    return user && user.isActive !== false ? user : null;
  }

  findByEmailWithPassword(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).select('+password').exec();
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.userModel.exists({ email });
    if (exists) throw new ConflictException('Adresse e-mail déjà utilisée');
    const hash = await bcrypt.hash(dto.password, 10);
    const created = await this.userModel.create({ ...dto, email, password: hash });
    const { password, ...rest } = created.toObject();
    return rest;
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    const current = await this.findById(id);
    const losesAdmin =
      current.role === 'admin' &&
      current.isActive !== false &&
      ((dto.role !== undefined && dto.role !== 'admin') || dto.isActive === false);

    if (losesAdmin && actorId && actorId === id) {
      throw new BadRequestException('Vous ne pouvez pas retirer vos propres droits administrateur');
    }
    if (losesAdmin) await this.ensureAnotherActiveAdmin(id);

    const update: Record<string, unknown> = { ...dto };
    if (dto.email) update.email = dto.email.toLowerCase().trim();
    if (dto.password) update.password = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .lean()
      .exec();
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async remove(id: string, actorId?: string) {
    if (actorId && actorId === id) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    }
    const user = await this.findById(id);
    if (user.role === 'admin' && user.isActive !== false) await this.ensureAnotherActiveAdmin(id);
    await this.userModel.deleteOne({ _id: user._id }).exec();
    return { deleted: true };
  }

  /** Prevents locking everybody out of the admin panel. */
  private async ensureAnotherActiveAdmin(exceptId: string) {
    const others = await this.userModel.countDocuments({
      _id: { $ne: exceptId },
      role: 'admin',
      isActive: { $ne: false },
    });
    if (others === 0) {
      throw new BadRequestException('Il doit rester au moins un administrateur actif');
    }
  }
}
