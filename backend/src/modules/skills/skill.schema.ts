import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SkillDocument = Skill & Document;

@Schema({ timestamps: true })
export class Skill {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, enum: ['frontend', 'backend', 'tools', 'design', 'other'] }) category: string;
  @Prop({ required: true, min: 0, max: 100 }) level: number;
  @Prop() icon: string;
  @Prop({ default: 0 }) order: number;
  @Prop({ default: true }) visible: boolean;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);
