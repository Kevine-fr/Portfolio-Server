import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({ timestamps: true })
export class Tag {
  @Prop({ required: true, unique: true, trim: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true }) slug: string;
  @Prop() color: string;
  @Prop() description: string;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
