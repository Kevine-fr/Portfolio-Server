import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, trim: true, lowercase: true }) email: string;
  @Prop({ trim: true }) subject: string;
  @Prop({ required: true, trim: true }) message: string;
  @Prop({ default: false }) read: boolean;
  @Prop({ default: false }) archived: boolean;
  @Prop() ip: string;
  @Prop() userAgent: string;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
