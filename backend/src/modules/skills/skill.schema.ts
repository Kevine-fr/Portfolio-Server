import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CONTENT_SOURCES } from '../../common/source';

export type SkillDocument = Skill & Document;
export const SKILL_CATEGORIES = ['frontend', 'backend', 'tools', 'design', 'other'] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

@Schema({ timestamps: true })
export class Skill {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, enum: SKILL_CATEGORIES }) category: string;
  @Prop({ required: true, min: 0, max: 100 }) level: number;
  @Prop() icon: string;
  @Prop({ default: 0 }) order: number;
  @Prop({ default: true }) visible: boolean;
  @Prop({ default: 'manual', enum: CONTENT_SOURCES }) source: string;
  /** Stable identifier of a synced item (e.g. "skill:typescript"). */
  @Prop() sourceKey: string;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);
SkillSchema.index({ category: 1, order: 1, level: -1 });
