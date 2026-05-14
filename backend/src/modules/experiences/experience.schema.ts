import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ExperienceDocument = Experience & Document;

@Schema({ timestamps: true })
export class Experience {
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) company: string;
  @Prop() location: string;
  @Prop({ required: true }) startDate: Date;
  @Prop() endDate: Date;
  @Prop({ default: false }) current: boolean;
  @Prop() description: string;
  @Prop({ default: [] }) achievements: string[];
  @Prop({ default: [] }) techStack: string[];
  @Prop({ default: 0 }) order: number;
}

export const ExperienceSchema = SchemaFactory.createForClass(Experience);
