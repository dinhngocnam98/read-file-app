import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Gc5_report>;

@Schema()
export class Gc5_report {
  @Prop()
  folder_dir: string;

  @Prop()
  signal_1: object[];

  @Prop()
  signal_2: object[];

  @Prop({default: Date.now})
  created_at: Date;

  @Prop({default: Date.now, set: (date: Date) => date || Date.now()})
  updated_at: Date;
}

export const Gc5_reportSchema = SchemaFactory.createForClass(Gc5_report);
