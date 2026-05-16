import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class TimelineEntry {
  @Prop({ required: true }) year: string;
  @Prop({ required: true }) title: string;
  @Prop() description: string;
  @Prop({ default: 0 }) order: number;
}
export const TimelineEntrySchema = SchemaFactory.createForClass(TimelineEntry);

@Schema({ _id: false })
export class ValueEntry {
  @Prop({ required: true }) icon: string;
  @Prop({ required: true }) title: string;
  @Prop() description: string;
  @Prop({ default: 0 }) order: number;
}
export const ValueEntrySchema = SchemaFactory.createForClass(ValueEntry);

@Schema({ timestamps: true })
export class About extends Document {
  // Singleton flag — only one document of kind="default" exists.
  @Prop({ default: 'default', unique: true, index: true })
  kind: string;

  // Bio prose. Wrap words with **double asterisks** to highlight them in gold on the frontend.
  @Prop({ default: '' }) bio: string;

  // Question shown above the bio (Title of the About section)
  @Prop({ default: 'Qui suis-je ?' }) title: string;

  @Prop({ type: [TimelineEntrySchema], default: [] }) timeline: TimelineEntry[];
  @Prop({ type: [ValueEntrySchema],    default: [] }) values:   ValueEntry[];
}
export const AboutSchema = SchemaFactory.createForClass(About);
