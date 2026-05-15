import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ required: true, trim: true, lowercase: true, unique: true }) slug: string;
  @Prop({ trim: true }) subtitle: string;
  @Prop({ trim: true }) description: string;
  @Prop({ default: '' }) longDescription: string;

  @Prop({ default: [] }) techStack: string[];
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }], default: [] }) tags: Types.ObjectId[];

  @Prop() coverImage: string;
  @Prop({ default: [] }) gallery: string[];
  @Prop() demoVideo: string;

  @Prop() liveUrl: string;
  @Prop() repoUrl: string;

  @Prop({ default: false }) featured: boolean;
  @Prop({ default: 0 }) order: number;
  @Prop({ default: 'published', enum: ['draft', 'published', 'archived'] }) status: string;

  @Prop() year: number;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
