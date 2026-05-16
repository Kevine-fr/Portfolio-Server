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

@Schema({ _id: false })
export class HeroStat {
  @Prop({ required: true }) label: string;
  @Prop({ required: true, default: 0 }) value: number;
  @Prop({ default: 0 }) order: number;
}
export const HeroStatSchema = SchemaFactory.createForClass(HeroStat);

@Schema({ timestamps: true })
export class About extends Document {
  @Prop({ default: 'default', unique: true, index: true })
  kind: string;

  // ─── Hero section ──────────────────────────────────────────────────
  @Prop({ default: '' }) firstName: string;
  @Prop({ default: '' }) lastName:  string;

  // Roles cyclés dans l'animation typewriter (one per line in admin)
  @Prop({ type: [String], default: [] }) roles: string[];

  // Punchline shown below the name on the home page
  @Prop({ default: '' }) tagline: string;

  // Animated counter cards. e.g. [{ label: 'ANS XP', value: 3 }, …]
  @Prop({ type: [HeroStatSchema], default: [] }) stats: HeroStat[];

  // ─── About section ─────────────────────────────────────────────────
  @Prop({ default: 'Qui suis-je ?' }) title: string;

  // Bio prose. Wrap words with **double asterisks** to highlight them in gold.
  @Prop({ default: '' }) bio: string;

  @Prop({ default: '' }) cvUrl: string;
  @Prop({ default: '' }) cvFilename: string;

  @Prop({ type: [TimelineEntrySchema], default: [] }) timeline: TimelineEntry[];
  @Prop({ type: [ValueEntrySchema],    default: [] }) values:   ValueEntry[];
}
export const AboutSchema = SchemaFactory.createForClass(About);
