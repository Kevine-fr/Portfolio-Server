import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EducationDocument = Education & Document;

@Schema({ timestamps: true })
export class Education {
  @Prop({ required: true }) school: string;
  @Prop({ required: true }) degree: string;
  @Prop() field: string;
  @Prop() location: string;
  @Prop({ required: true }) startDate: Date;
  @Prop() endDate: Date;
  @Prop() description: string;
  @Prop({ default: 0 }) order: number;
}

export const EducationSchema = SchemaFactory.createForClass(Education);
