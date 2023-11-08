import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Hplc_report>;

@Schema()
export class Hplc_report {
  @Prop()
  folder_dir: string;

  @Prop()
  signal_1: object[];

  @Prop()
  signal_2: object[];

  @Prop()
  date: Date;

  @Prop({ default: Date.now })
  created_at: Date;

  @Prop({ default: Date.now, set: (date: Date) => date || Date.now() })
  updated_at: Date;
}

export const Hplc_reportSchema = SchemaFactory.createForClass(Hplc_report);
