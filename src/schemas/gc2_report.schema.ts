import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Gc2_report>;

@Schema()
export class Gc2_report {
  @Prop()
  folder_dir: string;

  @Prop({ type: Object })
  data: any;

  @Prop()
  date: Date;

  @Prop({ default: Date.now })
  created_at: Date;

  @Prop({ default: Date.now, set: (date: Date) => date || Date.now() })
  updated_at: Date;
}

export const Gc2_reportSchema = SchemaFactory.createForClass(Gc2_report);
